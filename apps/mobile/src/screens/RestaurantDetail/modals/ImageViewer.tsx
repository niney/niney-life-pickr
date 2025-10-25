import React from 'react';
import ImageViewing from 'react-native-image-viewing';

interface ImageViewerProps {
  visible: boolean;
  imageUrls: string[];
  imageIndex: number;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  visible,
  imageUrls,
  imageIndex,
  onClose,
}) => {
  return (
    <ImageViewing
      images={imageUrls.map(uri => ({ uri }))}
      imageIndex={imageIndex}
      visible={visible}
      onRequestClose={onClose}
    />
  );
};

export default ImageViewer;
