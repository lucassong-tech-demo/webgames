type StartRequestValidation =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; error: string }>;

export async function validateStartRequest(request: Request): Promise<StartRequestValidation> {
  const contentLength = request.headers.get('content-length');

  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) {
      return { ok: false, error: 'Content-Length must be a non-negative integer' };
    }

    if (Number(contentLength) > 0) {
      return { ok: false, error: 'Request body must be empty' };
    }
  }

  if (request.body === null) {
    return { ok: true };
  }

  const reader = request.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        return { ok: true };
      }

      if (value.byteLength > 0) {
        return { ok: false, error: 'Request body must be empty' };
      }
    }
  } catch {
    return { ok: false, error: 'Unable to read request body' };
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
