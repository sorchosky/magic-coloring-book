import { useState } from 'react';
import StartScreen from './screens/StartScreen.jsx';
import LineArtScreen from './screens/LineArtScreen.jsx';

export default function App() {
  const [photoImageData, setPhotoImageData] = useState(null);

  function reset() {
    setPhotoImageData(null);
  }

  if (!photoImageData) {
    return <StartScreen onPhotoReady={setPhotoImageData} />;
  }

  return <LineArtScreen imageData={photoImageData} onStartOver={reset} />;
}
