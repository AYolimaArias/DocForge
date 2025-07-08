import { google } from 'googleapis';

export async function uploadFileToDrive({
  accessToken,
  fileName,
  mimeType,
  buffer,
  parentFolderId
}: {
  accessToken: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  parentFolderId?: string;
}) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata: any = {
    name: fileName,
  };
  if (parentFolderId) {
    fileMetadata.parents = [parentFolderId];
  }

  const media = {
    mimeType,
    body: Buffer.isBuffer(buffer) ? BufferToStream(buffer) : buffer,
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, webViewLink, webContentLink',
  });

  return response.data;
}

// Utilidad para convertir Buffer a ReadableStream
import { Readable } from 'stream';
function BufferToStream(buffer: Buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
} 