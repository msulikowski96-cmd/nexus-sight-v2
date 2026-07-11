import VideoTemplate from "@/components/video/VideoTemplate";

export default function App() {
  return (
    <div
      style={{
        background: '#000',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* 9:16 container with container-type so cqw units work correctly inside */}
      <div
        style={{
          aspectRatio: '9 / 16',
          height: '100%',
          maxWidth: '100%',
          position: 'relative',
          overflow: 'hidden',
          containerType: 'size',
        }}
      >
        <VideoTemplate />
      </div>
    </div>
  );
}
