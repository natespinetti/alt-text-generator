// Convert Blob to base64 and extract format
const convertBlobToBase64WithFormat = (
  blob: Blob
): Promise<{ base64: string; format: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const formatMatch = base64data.match(/^data:image\/(png|webp|svg\+xml|jpeg|jpg);base64,/);
      let format = "unknown";
      if (formatMatch?.[1]) {
        format = formatMatch[1] === 'jpeg' ? 'jpg' : formatMatch[1];
      }
      resolve({ base64: base64data.split(',')[1], format });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default convertBlobToBase64WithFormat;