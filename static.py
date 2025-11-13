from PIL import Image
import argparse

def intelligent_try_on(model_path, garment_path, output_path,
                       target_body_ratio=0.55, vertical_placement_ratio=0.25):
    try:
        model = Image.open(model_path).convert("RGB")
        garment = Image.open(garment_path).convert("RGBA")

        model_width, model_height = model.size
        garment_width, garment_height = garment.size

        target_width = int(model_width * target_body_ratio)
        scale_factor = target_width / garment_width
        new_height = int(garment_height * scale_factor)
        new_size = (target_width, new_height)

        x_offset = max(0, (model_width - target_width) // 2)
        y_offset = max(0, int(model_height * vertical_placement_ratio))
        position = (x_offset, y_offset)

        resized = garment.resize(new_size, Image.Resampling.LANCZOS)
        model.paste(resized, position, resized)
        model.save(output_path)
        print("Saved:", output_path)
    except Exception as e:
        print("intelligent_try_on error:", e)
        raise

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('model_path')
    parser.add_argument('garment_path')
    parser.add_argument('output_path')
    parser.add_argument('--ratio', type=float, default=0.55)
    parser.add_argument('--vertical', type=float, default=0.25)
    args = parser.parse_args()
    intelligent_try_on(args.model_path, args.garment_path, args.output_path, args.ratio, args.vertical)
