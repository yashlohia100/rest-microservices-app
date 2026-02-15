import jwt from 'jsonwebtoken';

// Wrapping the callback in a Promise to use async/await
export function signJwtAsync(
  payload: string | object,
  secret: string,
  options?: jwt.SignOptions,
) {
  return new Promise((resolve, reject) => {
    jwt.sign(payload, secret, options || {}, (err, token) => {
      if (err) reject(err);
      else resolve(token);
    });
  });
}

export function verifyJwtAsync(
  token: string,
  secret: string,
  options?: jwt.VerifyOptions,
) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, options || {}, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
}
