import { Request, Response, NextFunction } from "express";
import { getAuth } from "firebase-admin/auth";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Não autorizado." });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await getAuth().verifyIdToken(idToken);
      (req as any).user = decodedToken;
      next();
    } catch (err: any) {
      res.status(401).json({ error: "Sessão inválida ou expirada." });
      return;
    }
  } catch (err: any) {
    res.status(500).json({ error: "Erro interno de autenticação no servidor." });
    return;
  }
}
