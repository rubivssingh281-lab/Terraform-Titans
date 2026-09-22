#!/usr/bin/env python3
"""
Echolytix Offline Training Pipeline: WLASL Sign Language Classifier
------------------------------------------------------------------
This script provides the complete PyTorch training pipeline to train a custom
neural network on the Word-Level American Sign Language (WLASL) dataset.

It performs the following:
1. Video landmark extraction: Uses MediaPipe Hands to extract 21 3D landmarks per hand.
2. Coordinate Normalization: Translates wrist to (0,0,0) and scales max distance to 1 (matching Echolytix JS).
3. PyTorch Model Definition: Matches the 3-layer Feedforward MLP executed in src/components/SignLanguage.tsx.
4. Training & Optimization: Runs CrossEntropyLoss optimization.
5. Weight Export: Saves the trained weights in JSON matching the src/data/gesture_model_weights.json schema.

Prerequisites:
    pip install opencv-python mediapipe torch numpy
"""

import os
import json
import time
import numpy as np
import cv2
import mediapipe as mp
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

# --- 1. MEDIAPIPE LANDMARK EXTRACTION UTILITY ---
class LandmarkExtractor:
    def __init__(self):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.abspath(os.path.join(script_dir, "../public/models/hand_landmarker.task"))
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"MediaPipe Hand Landmarker model file not found at: {model_path}")

        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision

        self.model_path = model_path
        
        # Configure HandLandmarker options
        self.base_options = python.BaseOptions(
            model_asset_path=self.model_path,
            delegate=python.BaseOptions.Delegate.CPU
        )
        self.options = vision.HandLandmarkerOptions(
            base_options=self.base_options,
            num_hands=1,
            min_hand_detection_confidence=0.5,
            min_hand_presence_confidence=0.5
        )
        self.landmarker = vision.HandLandmarker.create_from_options(self.options)

    def extract_from_video(self, video_path):
        """
        Parses video frames, extracts 21 3D hand landmarks, and normalizes coordinates.
        Returns a list of 63-feature flattened landmark arrays for successful frames.
        """
        import mediapipe as mp
        cap = cv2.VideoCapture(video_path)
        video_landmarks = []

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Flip horizontally to match selfie view
            frame = cv2.flip(frame, 1)
            rgba_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGBA)
            
            # Convert frame to MediaPipe Image
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGBA, data=rgba_frame)
            
            # Run detection
            results = self.landmarker.detect(mp_image)

            if results.hand_landmarks:
                hand_landmarks = results.hand_landmarks[0]
                normalized = self.normalize_landmarks(hand_landmarks)
                if normalized is not None:
                    video_landmarks.append(normalized)

        cap.release()
        return video_landmarks

    def normalize_landmarks(self, landmarks):
        """
        Applies Translation and Scale Invariance to landmarks.
        Wrist (point 0) becomes the origin, scaled by maximum hand span.
        Flattens 21 x 3D landmarks to a 63-dimension array.
        """
        if len(landmarks) < 21:
            return None

        # 1. Translation: wrist as origin
        wrist = landmarks[0]
        shifted = []
        for p in landmarks:
            shifted.append([p.x - wrist.x, p.y - wrist.y, p.z - wrist.z])
        
        shifted = np.array(shifted)

        # 2. Scale Invariance: Divide by max distance from wrist
        distances = np.linalg.norm(shifted, axis=1)
        max_dist = np.max(distances)
        if max_dist < 1e-5:
            max_dist = 1e-5

        normalized = shifted / max_dist

        # 3. Flatten coordinates to 63 features
        return normalized.flatten()


# --- 2. DATASET DEFINITION ---
class WLASLDataset(Dataset):
    def __init__(self, data_list, labels_list):
        self.data = torch.tensor(np.array(data_list), dtype=torch.float32)
        self.labels = torch.tensor(np.array(labels_list), dtype=torch.long)

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        return self.data[idx], self.labels[idx]


# --- 3. PYTORCH MODEL DEFINITION ---
class SignClassifier(nn.Module):
    """
    3-Layer Multilayer Perceptron (MLP) Feedforward neural network matching
    the client-side Javascript implementation in SignLanguage.tsx
    """
    def __init__(self, num_classes):
        super(SignClassifier, self).__init__()
        # Input layer: 63 features (21 landmarks x 3 coordinates)
        # Hidden Layer 1: 63 -> 64 (ReLU)
        self.fc1 = nn.Linear(63, 64)
        self.relu1 = nn.ReLU()
        # Hidden Layer 2: 64 -> 32 (ReLU)
        self.fc2 = nn.Linear(64, 32)
        self.relu2 = nn.ReLU()
        # Output Layer: 32 -> num_classes (Softmax applied in client-side)
        self.fc3 = nn.Linear(32, num_classes)

    def forward(self, x):
        out = self.fc1(x)
        out = self.relu1(out)
        out = self.fc2(out)
        out = self.relu2(out)
        out = self.fc3(out)
        return out


# --- 4. EXPORT WEIGHTS TO ECHOLYTIX FORMAT ---
def export_weights(model, classes, accuracy, dataset_size, output_path):
    """
    Extracts weights and biases from the trained PyTorch model layers
    and writes them in the exact JSON schema required by Echolytix.
    """
    state_dict = model.state_dict()
    
    weights_json = {
        "w1": state_dict['fc1.weight'].cpu().numpy().tolist(),
        "b1": state_dict['fc1.bias'].cpu().numpy().tolist(),
        "w2": state_dict['fc2.weight'].cpu().numpy().tolist(),
        "b2": state_dict['fc2.bias'].cpu().numpy().tolist(),
        "w3": state_dict['fc3.weight'].cpu().numpy().tolist(),
        "b3": state_dict['fc3.bias'].cpu().numpy().tolist(),
        "gestureClasses": classes,
        "accuracy": f"{accuracy:.2f}",
        "datasetSize": dataset_size,
        "trainedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    with open(output_path, 'w') as f:
        json.dump(weights_json, f, indent=2)
    print(f"\n[SUCCESS] Weights exported successfully to: {output_path}")


# --- 5. PIPELINE INSTRUCTION SHEET ---
def print_pipeline_instructions():
    print("""
=== ECHOLYTIX - MULTI-DATASET TRAINING PIPELINE INSTRUCTIONS ===

This pipeline supports training on either the WLASL dataset or the MS-ASL dataset.

Option 1: WLASL Dataset
1. Download index file (WLASAL_v0.3.json or WLASL_v1.0.json) into the root folder.
2. Run target downloader: `python scripts/download_wlasl_subset.py`
3. Run training: `python scripts/train_wlasl.py --dataset wlasl`

Option 2: MS-ASL Dataset
1. Run downloader: `python scripts/download_msasl_subset.py`
2. Run training: `python scripts/train_wlasl.py --dataset msasl`

Common options:
- Add `--mock` flag to run simulated/mock training for fast validation.
- Output weights will be written directly to `src/data/gesture_model_weights.json`.
================================================================
""")


# --- 6. REAL WLASL DATA LOADER ---
def load_real_wlasl_dataset(json_path, videos_dir, target_classes, cache_path):
    """
    Loads WLASL annotations, maps Echolytix classes to WLASL glosses (including synonyms),
    runs LandmarkExtractor frame-by-frame on video files, and caches the results to avoid
    re-running expensive MediaPipe processing on subsequent runs.
    """
    # Mapping of Echolytix classes to possible WLASL glosses/synonyms
    class_mapping = {
        "HELLO": ["hello"],
        "YES": ["yes"],
        "NO": ["no"],
        "HELP": ["help"],
        "NEED WATER": ["water"],
        "THANK YOU": ["thank you", "thanks"],
        "PLEASE": ["please"],
        "PAIN": ["pain", "hurt"]
    }
    
    # Invert class mapping: WLASL gloss -> Echolytix target class
    gloss_to_target = {}
    for target, glosses in class_mapping.items():
        for gloss in glosses:
            gloss_to_target[gloss.lower()] = target

    class_to_idx = {cls: idx for idx, cls in enumerate(target_classes)}

    # 1. Check if cached features exist to skip extraction
    if os.path.exists(cache_path):
        print(f"Found cached landmarks file at '{cache_path}'. Loading...")
        try:
            with open(cache_path, 'r') as f:
                cache_data = json.load(f)
            X = []
            y = []
            for item in cache_data:
                cls_name = item["class_name"]
                if cls_name in class_to_idx:
                    label_idx = class_to_idx[cls_name]
                    for frame_landmarks in item["landmarks"]:
                        X.append(frame_landmarks)
                        y.append(label_idx)
            if len(X) > 0:
                print(f"[SUCCESS] Loaded {len(X)} landmark samples from cache.")
                return np.array(X, dtype=np.float32), np.array(y, dtype=np.int64)
        except Exception as e:
            print(f"Warning: Failed to load cache from '{cache_path}': {e}. Proceeding with fresh extraction...")

    # 2. Verify dataset files exist
    if not os.path.exists(json_path):
        print(f"WLASL Index JSON not found at: {json_path}")
        return None, None

    if not os.path.exists(videos_dir):
        print(f"Videos directory not found at: {videos_dir}")
        return None, None

    print(f"Loading WLASL annotations from: {json_path}...")
    with open(json_path, 'r') as f:
        wlasl_data = json.load(f)

    extractor = LandmarkExtractor()
    X = []
    y = []
    cached_to_save = []

    print("\nBeginning MediaPipe Hand Landmark Extraction on videos...")
    
    total_videos_found = 0
    total_videos_processed = 0

    for entry in wlasl_data:
        gloss = entry.get("gloss", "").lower()
        if gloss not in gloss_to_target:
            continue

        target_cls = gloss_to_target[gloss]
        label_idx = class_to_idx[target_cls]

        gloss_landmarks = []
        print(f"Processing WLASL gloss '{gloss}' (Target: '{target_cls}')...")

        for instance in entry.get("instances", []):
            video_id = instance.get("video_id")
            video_path = os.path.join(videos_dir, f"{video_id}.mp4")

            if os.path.exists(video_path):
                total_videos_found += 1
                print(f"  Found video: {video_path}")
                landmarks = extractor.extract_from_video(video_path)
                if landmarks:
                    print(f"    -> Extracted {len(landmarks)} frames of hand landmarks.")
                    gloss_landmarks.extend(landmarks)
                    for lm in landmarks:
                        X.append(lm)
                        y.append(label_idx)
                    total_videos_processed += 1
                else:
                    print(f"    -> Warning: No landmarks detected in {video_path}")

        if gloss_landmarks:
            cached_to_save.append({
                "class_name": target_cls,
                "landmarks": gloss_landmarks
            })

    if len(X) == 0:
        print("\n[INFO] No videos matched or found in the videos/ directory.")
        return None, None

    print(f"\n[INFO] Extracted {len(X)} frames across {total_videos_processed} of {total_videos_found} videos.")

    # Save to cache file
    try:
        print(f"Saving extracted landmarks to cache '{cache_path}'...")
        with open(cache_path, 'w') as f:
            json.dump(cached_to_save, f)
        print("Cache saved successfully.")
    except Exception as e:
        print(f"Warning: Failed to save landmarks cache: {e}")

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int64)


# --- 7. REAL MS-ASL DATA LOADER ---
def load_real_msasl_dataset(subset_index_path, target_classes, cache_path):
    """
    Loads MS-ASL annotations from a generated subset_index_path,
    runs LandmarkExtractor frame-by-frame on video files, and caches the results.
    """
    class_to_idx = {cls: idx for idx, cls in enumerate(target_classes)}

    # 1. Check if cached features exist to skip extraction
    if os.path.exists(cache_path):
        print(f"Found cached landmarks file at '{cache_path}'. Loading...")
        try:
            with open(cache_path, 'r') as f:
                cache_data = json.load(f)
            X = []
            y = []
            for item in cache_data:
                cls_name = item["class_name"]
                if cls_name in class_to_idx:
                    label_idx = class_to_idx[cls_name]
                    for frame_landmarks in item["landmarks"]:
                        X.append(frame_landmarks)
                        y.append(label_idx)
            if len(X) > 0:
                print(f"[SUCCESS] Loaded {len(X)} landmark samples from cache.")
                return np.array(X, dtype=np.float32), np.array(y, dtype=np.int64)
        except Exception as e:
            print(f"Warning: Failed to load cache from '{cache_path}': {e}. Proceeding with fresh extraction...")

    # 2. Verify dataset files exist
    if not os.path.exists(subset_index_path):
        print(f"MS-ASL subset index JSON not found at: {subset_index_path}")
        return None, None

    print(f"Loading MS-ASL subset index from: {subset_index_path}...")
    with open(subset_index_path, 'r') as f:
        subset_data = json.load(f)

    extractor = LandmarkExtractor()
    X = []
    y = []
    cached_to_save = {}

    print("\nBeginning MediaPipe Hand Landmark Extraction on MS-ASL videos...")
    
    total_videos_found = 0
    total_videos_processed = 0

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    for entry in subset_data:
        video_rel_path = entry.get("video_path")
        video_path = os.path.join(project_root, video_rel_path)
        target_cls = entry.get("class_name")
        label_idx = entry.get("label")

        if os.path.exists(video_path):
            total_videos_found += 1
            print(f"  Found video: {video_path}")
            landmarks = extractor.extract_from_video(video_path)
            if landmarks:
                print(f"    -> Extracted {len(landmarks)} frames of hand landmarks.")
                if target_cls not in cached_to_save:
                    cached_to_save[target_cls] = []
                cached_to_save[target_cls].extend(landmarks)
                for lm in landmarks:
                    X.append(lm)
                    y.append(label_idx)
                total_videos_processed += 1
            else:
                print(f"    -> Warning: No landmarks detected in {video_path}")

    if len(X) == 0:
        print("\n[INFO] No MS-ASL videos matched or found.")
        return None, None

    print(f"\n[INFO] Extracted {len(X)} frames across {total_videos_processed} of {total_videos_found} videos.")

    # Save to cache file
    try:
        cached_list = [{"class_name": cls, "landmarks": lms} for cls, lms in cached_to_save.items()]
        print(f"Saving extracted landmarks to cache '{cache_path}'...")
        with open(cache_path, 'w') as f:
            json.dump(cached_list, f)
        print("Cache saved successfully.")
    except Exception as e:
        print(f"Warning: Failed to save landmarks cache: {e}")

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int64)


# --- 8. TRAINING RUNNER ---
if __name__ == "__main__":
    print_pipeline_instructions()
    
    classes = ["HELLO", "YES", "NO", "HELP", "NEED WATER", "THANK YOU", "PLEASE", "PAIN"]
    num_classes = len(classes)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    import sys
    
    # Parse dataset argument (wlasl or msasl)
    dataset_name = "wlasl"
    for i in range(len(sys.argv) - 1):
        if sys.argv[i] == "--dataset":
            dataset_name = sys.argv[i+1].lower()
            
    is_mock = "--mock" in sys.argv

    # Configure dataset-specific paths
    if dataset_name == "msasl":
        json_path = os.path.join(script_dir, "../msasl_subset_index.json")
        videos_dir = os.path.join(script_dir, "../videos_msasl")
        cache_path = os.path.join(script_dir, "../extracted_landmarks_cache_msasl.json")
    else:
        # Default: WLASL
        dataset_name = "wlasl"
        json_path = os.path.join(script_dir, "../WLASL_v1.0.json")
        if not os.path.exists(json_path):
            json_path = os.path.join(script_dir, "../WLASAL_v0.3.json")
        videos_dir = os.path.join(script_dir, "../videos")
        cache_path = os.path.join(script_dir, "../extracted_landmarks_cache.json")

    output_path = os.path.join(script_dir, "../src/data/gesture_model_weights.json")

    print(f"Selected Dataset: {dataset_name.upper()}")
    print("Checking dataset paths:")
    print(f"  Index JSON path: {os.path.abspath(json_path)}")
    print(f"  Videos directory: {os.path.abspath(videos_dir)}")
    print(f"  Cache path: {os.path.abspath(cache_path)}")
    print(f"  Output path: {os.path.abspath(output_path)}")

    X_train, y_train = None, None
    if not is_mock:
        if dataset_name == "msasl":
            X_train, y_train = load_real_msasl_dataset(json_path, classes, cache_path)
        else:
            X_train, y_train = load_real_wlasl_dataset(json_path, videos_dir, classes, cache_path)
    else:
        print("\n[INFO] Running with --mock flag explicitly requested.")

    if X_train is None or len(X_train) == 0:
        print(f"\n=== FALLBACK: RUNNING SIMULATED RUN FOR {dataset_name.upper()} ===")
        if not is_mock:
            print(f"Could not find {dataset_name.upper()} videos or index. Using random mock dataset...")
        else:
            print("Using random mock dataset to demonstrate loop...")
        X_train = np.random.randn(500, 63).astype(np.float32)
        y_train = np.random.randint(0, num_classes, size=(500,))
        is_mock = True
        output_path = os.path.join(script_dir, "../src/data/gesture_model_weights_simulated.json")

    dataset = WLASLDataset(X_train, y_train)
    
    # Train-test split
    if not is_mock and len(dataset) > 5:
        train_size = int(0.8 * len(dataset))
        val_size = len(dataset) - train_size
        train_dataset, val_dataset = torch.utils.data.random_split(dataset, [train_size, val_size])
        train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
    else:
        train_loader = DataLoader(dataset, batch_size=32, shuffle=True)
        val_loader = train_loader

    model = SignClassifier(num_classes)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    epochs = 20 if not is_mock else 5
    print(f"\nTraining model for {epochs} epochs...")
    
    for epoch in range(epochs):
        model.train()
        epoch_loss = 0
        correct = 0
        total = 0
        for data, targets in train_loader:
            optimizer.zero_grad()
            outputs = model(data)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()

            _, predicted = outputs.max(1)
            total += targets.size(0)
            correct += predicted.eq(targets).sum().item()

        train_acc = (correct / total) * 100 if total > 0 else 0
        
        # Validation accuracy check
        model.eval()
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for data, targets in val_loader:
                outputs = model(data)
                _, predicted = outputs.max(1)
                val_total += targets.size(0)
                val_correct += predicted.eq(targets).sum().item()
        
        val_acc = (val_correct / val_total) * 100 if val_total > 0 else 0
        print(f"Epoch {epoch+1:02d}/{epochs:02d} | Loss: {epoch_loss:.4f} | Train Acc: {train_acc:.2f}% | Val Acc: {val_acc:.2f}%")

    # Export trained weights directly to Echolytix
    accuracy_to_export = val_acc if not is_mock else train_acc
    export_weights(
        model=model,
        classes=classes,
        accuracy=accuracy_to_export,
        dataset_size=len(dataset),
        output_path=output_path
    )

