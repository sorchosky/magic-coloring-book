import { useState } from 'react';
import StartScreen from './screens/StartScreen.jsx';
import LineArtScreen from './screens/LineArtScreen.jsx';

export default function App() {
  const [photoImageData, setPhotoImageData] = useState(null);
  const [stylizeError, setStylizeError] = useState(null);

  function reset() {
    setPhotoImageData(null);
    setStylizeError(null);
  }

  function handlePhotoReady(imageData, error) {
    setPhotoImageData(imageData);
    setStylizeError(error);
  }

  if (!photoImageData) {
    return <StartScreen onPhotoReady={handlePhotoReady} />;
  }

  return (
    <LineArtScreen imageData={photoImageData} stylizeError={stylizeError} onStartOver={reset} />
  );
}
