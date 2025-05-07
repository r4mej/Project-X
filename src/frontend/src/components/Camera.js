import React, { useRef, useEffect } from 'react';

function Camera() {
  const videoRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => { videoRef.current.srcObject = stream; })
      .catch(err => { console.error('Error accessing camera', err); });
  }, []);

  return (
    <div>
      <h2>Camera Feed</h2>
      <video ref={videoRef} autoPlay style={{ width: '100%' }} />
    </div>
  );
}

export default Camera;
