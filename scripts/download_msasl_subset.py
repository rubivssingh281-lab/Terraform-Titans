#!/usr/bin/env python3
import os
import json
import urllib.request
import sys
import subprocess
import ssl

# Bypass SSL certificate verification for direct downloads on macOS
ssl._create_default_https_context = ssl._create_unverified_context

# Echolytix target classes mapped to MS-ASL glosses/synonyms
CLASS_MAPPING = {
    "HELLO": ["hello"],
    "YES": ["yes"],
    "NO": ["no"],
    "HELP": ["help"],
    "NEED WATER": ["water"],
    "THANK YOU": ["thanks", "thank you"],
    "PLEASE": ["please"],
    "PAIN": ["hurt", "pain"]
}

def format_time_range(start_s, end_s):
    """Formats float seconds into *HH:MM:SS.ms-HH:MM:SS.ms for yt-dlp section downloader"""
    def to_hms(s):
        hrs = int(s // 3600)
        mins = int((s % 3600) // 60)
        secs = s % 60
        return f"{hrs:02d}:{mins:02d}:{secs:06.3f}"
    return f"*{to_hms(start_s)}-{to_hms(end_s)}"

def main(max_videos_per_class=3):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    
    classes_json_path = os.path.join(project_root, "MSASL_classes.json")
    train_json_path = os.path.join(project_root, "MSASL_train.json")
    videos_dir = os.path.join(project_root, "videos_msasl")
    subset_index_path = os.path.join(project_root, "msasl_subset_index.json")

    os.makedirs(videos_dir, exist_ok=True)

    # 1. Download MS-ASL JSON files if they don't exist
    base_url = "https://raw.githubusercontent.com/iamgarcia/msasl-video-downloader/master/"
    
    if not os.path.exists(classes_json_path):
        print(f"Downloading MSASL_classes.json from GitHub...")
        urllib.request.urlretrieve(base_url + "MSASL_classes.json", classes_json_path)
    
    if not os.path.exists(train_json_path):
        print(f"Downloading MSASL_train.json from GitHub...")
        urllib.request.urlretrieve(base_url + "MSASL_train.json", train_json_path)

    # Load annotations
    with open(classes_json_path, 'r') as f:
        classes_list = json.load(f)
    with open(train_json_path, 'r') as f:
        train_data = json.load(f)

    # Invert mapping: MS-ASL gloss -> Echolytix target class
    gloss_to_target = {}
    for target, glosses in CLASS_MAPPING.items():
        for gloss in glosses:
            gloss_to_target[gloss.lower()] = target

    # Group instances by target class
    instances_by_target = {cls: [] for cls in CLASS_MAPPING.keys()}
    for entry in train_data:
        # Note: MS-ASL entries usually have clean_text or text
        gloss = entry.get("clean_text", entry.get("text", "")).lower()
        if gloss in gloss_to_target:
            target_cls = gloss_to_target[gloss]
            instances_by_target[target_cls].append(entry)

    print("\nMS-ASL dataset target classes matching:")
    for target_cls, instances in instances_by_target.items():
        print(f"  {target_cls}: {len(instances)} instances available")

    # Downloader loop
    downloaded_records = []
    
    for target_cls, instances in instances_by_target.items():
        print(f"\n--- Downloading for class: {target_cls} ---")
        downloaded = 0
        
        for inst_idx, inst in enumerate(instances):
            if downloaded >= max_videos_per_class:
                break

            video_url = inst.get("url")
            start_time = inst.get("start_time", 0.0)
            end_time = inst.get("end_time", 0.0)
            label_idx = inst.get("label")
            
            # Format unique filename using label index and counter
            filename = f"msasl_{target_cls.replace(' ', '_')}_{label_idx}_{downloaded}.mp4"
            output_file = os.path.join(videos_dir, filename)

            if os.path.exists(output_file):
                print(f"  [{downloaded+1}/{max_videos_per_class}] Video {filename} already exists. Skipping.")
                downloaded_records.append({
                    "video_path": os.path.relpath(output_file, project_root),
                    "class_name": target_cls,
                    "label": list(CLASS_MAPPING.keys()).index(target_cls)
                })
                downloaded += 1
                continue

            print(f"  [{downloaded+1}/{max_videos_per_class}] Fetching section {format_time_range(start_time, end_time)} from {video_url}...")

            # Use yt-dlp to download and trim video segment
            cmd = [
                "yt-dlp",
                "--download-sections", format_time_range(start_time, end_time),
                "-o", output_file,
                "--format", "mp4",
                "--quiet",
                "--no-warnings",
                video_url
            ]

            try:
                # Run command with 25s timeout to prevent hanging on dead URLs
                result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
                if result.returncode == 0 and os.path.exists(output_file) and os.path.getsize(output_file) > 0:
                    print(f"    [SUCCESS] Segment downloaded to: {filename}")
                    downloaded_records.append({
                        "video_path": os.path.relpath(output_file, project_root),
                        "class_name": target_cls,
                        "label": list(CLASS_MAPPING.keys()).index(target_cls)
                    })
                    downloaded += 1
                else:
                    err_msg = result.stderr.decode('utf-8', errors='ignore')
                    print(f"    [FAILED] yt-dlp execution failed or skipped: {err_msg.strip()[:150]}")
            except subprocess.TimeoutExpired:
                print("    [FAILED] yt-dlp download timed out (30s). Skipping instance.")
            except Exception as e:
                print(f"    [FAILED] Download failed with error: {e}")

    # Write out local dataset index
    with open(subset_index_path, 'w') as f:
        json.dump(downloaded_records, f, indent=2)

    print(f"\n=== Download finished! ===")
    print(f"Total downloaded MS-ASL segments: {len(downloaded_records)}")
    print(f"Subset index file saved to: {subset_index_path}")

if __name__ == "__main__":
    max_v = 3
    if len(sys.argv) > 1:
        try:
            max_v = int(sys.argv[1])
        except ValueError:
            pass
    main(max_v)
