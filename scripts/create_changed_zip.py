import os
import zipfile
import subprocess

def get_changed_files():
    out = subprocess.check_output(['git', 'status', '--porcelain'], text=True)
    included = []

    for line in out.splitlines():
        if not line.strip():
            continue
        path = line[3:].strip().strip('"')
        if ' -> ' in path:
            path = path.split(' -> ')[1]

        # Exclusions for a clean shareable zip
        if any(ignored in path for ignored in [
            'target/', '.class', 'node_modules', '.git/',
            'echolytix.db-shm', 'echolytix.db-wal', 'Echolytix/'
        ]):
            continue

        if not os.path.exists(path):
            continue

        if os.path.isdir(path):
            for root, dirs, files in os.walk(path):
                if any(ignored in root for ignored in ['target', '.class', 'node_modules']):
                    continue
                for f in files:
                    if f.endswith('.class') or f.endswith('.jar'):
                        continue
                    full_p = os.path.join(root, f)
                    rel_p = os.path.relpath(full_p, '.').replace('\\', '/')
                    included.append(rel_p)
        else:
            included.append(path.replace('\\', '/'))

    return sorted(list(set(included)))

def main():
    files = get_changed_files()
    zip_filename = 'echolytix-changed-files.zip'
    
    print(f"Creating zip file: {zip_filename} with {len(files)} files...")
    with zipfile.ZipFile(zip_filename, 'w', compression=zipfile.ZIP_DEFLATED) as zipf:
        for f in files:
            if os.path.exists(f):
                zipf.write(f, arcname=f)
                print(f"  + Added: {f}")

    file_size_kb = os.path.getsize(zip_filename) / 1024
    print(f"\nSUCCESS! Archive created at: {os.path.abspath(zip_filename)} ({file_size_kb:.1f} KB)")

if __name__ == '__main__':
    main()
