#!/usr/bin/env python3
import os
import json
import urllib.request
import sys
import ssl

# Bypass SSL certificate verification for direct downloads on macOS
ssl._create_default_https_context = ssl._create_unverified_context


# Mapping of Echolytix classes to WLASL glosses/synonyms
CLASS_MAPPING = {
    "HELLO": ["hello"],
    "YES": ["yes"],
    "NO": ["no"],
    "HELP": ["help"],
    "NEED WATER": ["water"],
    "THANK YOU": ["thank you", "thanks"],
    "PLEASE": ["please"],
    "PAIN": ["pain", "hurt"]
}

def main(max_videos_per_class=5):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "../WLASAL_v0.3.json")
    videos_dir = os.path.join(script_dir, "../videos")

    os.makedirs(videos_dir, exist_ok=True)

    if not os.path.exists(json_path):
        print(f"[ERROR] Could not find {json_path}. Please download it first or run the downloader script from the project root.")
        sys.exit(1)

    print(f"Reading dataset index: {json_path}")
    with open(json_path, 'r') as f:
        wlasl_data = json.load(f)

    # Invert mapping: gloss -> target class
    gloss_to_target = {}
    for target, glosses in CLASS_MAPPING.items():
        for gloss in glosses:
            gloss_to_target[gloss.lower()] = target

    # Group dataset instances by target class
    instances_by_target = {cls: [] for cls in CLASS_MAPPING.keys()}
    for entry in wlasl_data:
        gloss = entry.get("gloss", "").lower()
        if gloss in gloss_to_target:
            target_cls = gloss_to_target[gloss]
            instances_by_target[target_cls].extend(entry.get("instances", []))

    # Print summary of available instances
    print("\nAvailable instances in WLASL index:")
    for target_cls, instances in instances_by_target.items():
        print(f"  {target_cls}: {len(instances)} videos available")

    print(f"\nDownloading up to {max_videos_per_class} videos per class to: {os.path.abspath(videos_dir)}")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
    }

    # Attempt to download
    for target_cls, instances in instances_by_target.items():
        print(f"\n--- Downloading for class: {target_cls} ---")
        downloaded = 0
        
        for inst in instances:
            if downloaded >= max_videos_per_class:
                break

            video_id = inst.get("video_id")
            video_url = inst.get("url")
            output_file = os.path.join(videos_dir, f"{video_id}.mp4")

            if os.path.exists(output_file):
                print(f"  [{downloaded+1}/{max_videos_per_class}] Video {video_id}.mp4 already exists. Skipping.")
                downloaded += 1
                continue

            print(f"  [{downloaded+1}/{max_videos_per_class}] Fetching video {video_id} from: {video_url}")

            # If it's a YouTube URL, we suggest using yt-dlp
            if "youtube.com" in video_url or "youtu.be" in video_url:
                try:
                    import yt_dlp
                    print("    Using yt-dlp to download YouTube video...")
                    ydl_opts = {
                        'outtmpl': output_file,
                        'format': 'mp4',
                        'quiet': True,
                        'no_warnings': True,
                    }
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        ydl.download([video_url])
                    if os.path.exists(output_file):
                        print(f"    [SUCCESS] Downloaded YouTube video to {output_file}")
                        downloaded += 1
                    else:
                        print("    [FAILED] yt-dlp did not output a file.")
                except ImportError:
                    print("    [WARNING] YouTube URL detected but 'yt-dlp' is not installed. Run 'pip install yt-dlp'. Skipping.")
                except Exception as e:
                    print(f"    [FAILED] yt-dlp error: {e}")
            else:
                # Direct MP4 download
                try:
                    req = urllib.request.Request(video_url, headers=headers)
                    with urllib.request.urlopen(req, timeout=10) as response, open(output_file, 'wb') as out_file:
                        out_file.write(response.read())
                    print(f"    [SUCCESS] Downloaded direct video to {output_file}")
                    downloaded += 1
                except Exception as e:
                    print(f"    [FAILED] Direct download error: {e}")

    print("\n=== Download process completed! ===")
    total_downloaded = sum(1 for f in os.listdir(videos_dir) if f.endswith('.mp4'))
    print(f"Total videos in videos/ folder: {total_downloaded}")
    print("Now you can run the training pipeline: python scripts/train_wlasl.py")

if __name__ == "__main__":
    max_v = 5
    if len(sys.argv) > 1:
        try:
            max_v = int(sys.argv[1])
        except ValueError:
            pass
    main(max_v)
