import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_production_key';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { phone, password } = req.body;

  try {
    // 1. TODO: Fetch user from your database here.
    // Example: const user = await db.user.findUnique({ where: { phone } })
    
    // Simulating database lookup for Super Admin Charles Banda
    let userFromDB = null;
    if (phone === '+265991234567') {
      userFromDB = {
        id: '1',
        name: 'Charles Banda',
        phone: '+265991234567',
        role: 'super_admin',
        is_admin: true,
        status: 'active',
        // In production, this hash is saved in DB. Plaintext is: "AdminSecure123"
        password_hash: '$2a$10$3eY9n6s5Fp66vC43C6h.VOhNstVIsHn/wNsk6GvVpxiVqR7L9H7re', 
      };
    }

    if (!userFromDB) {
      return res.status(401).json({ message: 'Invalid phone or password' });
    }

    // 2. Compare entered plaintext password with the hashed password from the DB
    const isPasswordCorrect = await bcrypt.compare(password, userFromDB.password_hash);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Invalid phone or password' });
    }

    // 3. Generate secure token
    const token = jwt.sign(
      { id: userFromDB.id, phone: userFromDB.phone, role: userFromDB.role, is_admin: userFromDB.is_admin },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.status(200).json({
      token,
      user: {
        id: userFromDB.id,
        name: userFromDB.name,
        phone: userFromDB.phone,
        role: userFromDB.role,
        is_admin: userFromDB.is_admin
      }
    });

  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong' });
  }
}
