import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_production_key';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authorization token
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized access' });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (!decoded.is_admin) return res.status(403).json({ message: 'Forbidden' });

    // Handle GET - Fetch list of admins
    if (req.method === 'GET') {
      // TODO: Fetch administrators from database 
      // Example: const admins = await db.user.findMany({ where: { is_admin: true } })
      
      const mockDbAdmins = [
        { id: '1', name: 'Charles Banda', phone: '+265991234567', role: 'super_admin', status: 'active', last_active: new Date().toISOString(), joined: '2024-01-01' }
      ];
      return res.status(200).json(mockDbAdmins);
    }

    // Handle POST - Invite/Create Admin
    if (req.method === 'POST') {
      const { name, phone, role } = req.body;
      
      // TODO: Save to your DB with a default temporary password or setup-token link
      const newAdmin = {
        id: Date.now().toString(),
        name,
        phone,
        role,
        status: 'invited',
        last_active: new Date().toISOString(),
        joined: new Date().toISOString()
      };

      return res.status(201).json(newAdmin);
    }

  } catch (err) {
    return res.status(401).json({ message: 'Session expired or invalid signature' });
  }
}