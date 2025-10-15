import { useState, useRef, useEffect } from "react";
import { Camera, Square, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { products } from "@/data/products";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const LiveTryOn = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayImageRef = useRef<HTMLImageElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        toast.success("Camera started!");
        
        // Start rendering loop
        requestAnimationFrame(drawFrame);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Failed to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsStreaming(false);
    toast.success("Camera stopped");
  };

  const drawFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlayImage = overlayImageRef.current;

    if (!video || !canvas || !isStreaming) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Overlay clothing if selected
    if (selectedProduct && overlayImage && overlayImage.complete) {
      const clothingWidth = canvas.width * 0.6;
      const clothingHeight = (overlayImage.height / overlayImage.width) * clothingWidth;
      const x = (canvas.width - clothingWidth) / 2;
      const y = canvas.height * 0.15; // Position at upper torso

      ctx.globalAlpha = 0.8;
      ctx.drawImage(overlayImage, x, y, clothingWidth, clothingHeight);
      ctx.globalAlpha = 1.0;
    }

    animationRef.current = requestAnimationFrame(drawFrame);
  };

  const captureSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = "aura-live-tryon.png";
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Snapshot captured!");
      }
    });
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      const product = products.find((p) => p.id === selectedProduct);
      if (product && overlayImageRef.current) {
        overlayImageRef.current.src = product.image;
      }
    }
  }, [selectedProduct]);

  return (
    <div className="min-h-screen py-12">
      <div className="container max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Live Try-On</h1>
          <p className="text-muted-foreground text-lg">
            See how clothing looks on you in real-time using your camera
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="md:col-span-2">
            <CardContent className="p-6">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {isStreaming ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover hidden"
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Camera is off. Click start to begin.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-4 mt-6">
                {!isStreaming ? (
                  <Button onClick={startCamera} size="lg">
                    <Camera className="mr-2 h-5 w-5" />
                    Start Camera
                  </Button>
                ) : (
                  <>
                    <Button onClick={stopCamera} variant="secondary" size="lg">
                      <Square className="mr-2 h-5 w-5" />
                      Stop Camera
                    </Button>
                    <Button onClick={captureSnapshot} size="lg">
                      <Download className="mr-2 h-5 w-5" />
                      Capture
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Select Clothing</h3>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an item" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedProduct && (
                <div className="mt-4">
                  <img
                    src={products.find((p) => p.id === selectedProduct)?.image}
                    alt="Selected item"
                    className="w-full rounded-lg"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    This item will appear as an overlay on your video feed
                  </p>
                </div>
              )}

              <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
                <h4 className="font-medium mb-2 text-sm">Tips:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Ensure good lighting</li>
                  <li>• Stand 2-3 feet from camera</li>
                  <li>• Face the camera directly</li>
                  <li>• Try different poses</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <img
          ref={overlayImageRef}
          alt="Overlay"
          className="hidden"
          crossOrigin="anonymous"
        />
      </div>
    </div>
  );
};
