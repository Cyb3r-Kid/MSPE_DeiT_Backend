import { Platform } from 'react-native';

/**
 * Prepares a multipart FormData payload for image upload that is compatible
 * with both React Native mobile runtimes (iOS/Android) and Web browsers.
 */
export async function buildImageFormData(imageUri: string, fieldName: string = 'file'): Promise<FormData> {
  const formData = new FormData();

  const isPng = imageUri.toLowerCase().includes('.png');
  const filename = isPng ? 'lesion-image.png' : 'lesion-image.jpg';
  const mimeType = isPng ? 'image/png' : 'image/jpeg';

  if (Platform.OS === 'web') {
    // In web browsers, convert URI (blob:, data:, or URL) into a real File object
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const file = new File([blob], filename, {
      type: blob.type || mimeType,
    });
    formData.append(fieldName, file);
  } else {
    // In native React Native (iOS / Android), use the standard RN FormData dictionary
    formData.append(fieldName, {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as any);
  }

  return formData;
}
