export function buildMessage(sender, data, file) {
  return {
    from: sender, to: data.recipient, subject: data.subject, text: data.content,
    disableFileAccess: true, disableUrlAccess: true,
    attachments: file ? [{ filename: 'resume.pdf', content: file.buffer, contentType: 'application/pdf' }] : [],
  };
}
