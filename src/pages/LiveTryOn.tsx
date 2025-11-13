import React, { useState } from "react";
import { toast } from "react-hot-toast";

const CLOTHES = [
  "top1_front.png",
  "top4_front.png",
  "top5_front.png",
  "top6_front.png",
];

export default function LiveTryOn() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedCloth, setSelectedCloth] = useState<string | null>(null);

  const startCamera = () => {
    setIsStreaming(true);
    toast.success("Camera started 🎥");
  };

  const tryOnCloth = async (filename: string) => {
    setSelectedCloth(filename);
    try {
      const res = await fetch("http://localhost:5000/try_on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cloth_filename: filename }),
      });
      if (!res.ok) throw new Error("Try-on failed");

      // Force refresh the video stream
      const videoFeed = document.getElementById("video-feed") as HTMLImageElement;
      if (videoFeed) {
        videoFeed.src = `http://localhost:5000/video_feed?t=${Date.now()}`;
      }

      toast.success(`Now trying on ${filename} 👕`);
    } catch (err) {
      console.error(err);
      toast.error("Try-on failed ❌");
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      <h1 className="text-2xl font-bold text-gray-800">👕 Virtual Try-On</h1>

      {!isStreaming ? (
        <button
          onClick={startCamera}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-md"
        >
          Start Camera
        </button>
      ) : (
        <div className="rounded-2xl overflow-hidden border-2 border-gray-300">
          <img
            id="video-feed"
            src="http://localhost:5000/video_feed"
            alt="Live Stream"
            className="w-[480px] h-[360px] object-cover"
          />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CLOTHES.map((cloth) => (
          <div
            key={cloth}
            onClick={() => tryOnCloth(cloth)}
            className={`cursor-pointer border-2 rounded-xl overflow-hidden hover:scale-105 transition-all ${
              selectedCloth === cloth ? "border-blue-500" : "border-gray-300"
            }`}
          >
            <img
              src={`http://localhost:5000/clothes_images/${cloth}`}
              alt={cloth}
              className="w-full h-48 object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
