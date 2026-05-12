import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

app.use(cors());
app.use(express.json());

// Auth Middleware
const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminMiddleware = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Health Check
app.get('/health', (req, res) => res.status(200).send('OK'));

// Routes

// --- Auth ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Strict Validation
    const nameRegex = /^[a-zA-Z\s]{2,30}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d\W_]{8,}$/;

    if (!nameRegex.test(name)) return res.status(400).json({ error: 'Name must be 2-30 letters only' });
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    if (!passRegex.test(password)) return res.status(400).json({ error: 'Password must be 8+ characters with at least one letter and one number' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const color = ['#e8ff47','#3fa4ff','#ff6b35','#ff3fa4','#2ecc71'][Math.floor(Math.random()*5)];
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'member', color }
    });

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, color: user.color } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, color: user.color } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, color: user.color } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/profile', authMiddleware, async (req: any, res: any) => {
  try {
    const { name, email, password } = req.body;
    let dataToUpdate: any = { name, email };
    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: dataToUpdate
    });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, color: user.color } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Projects ---
app.get('/api/projects', authMiddleware, async (req: any, res: any) => {
  try {
    if (req.user.role === 'admin') {
      const projects = await prisma.project.findMany({ 
        include: { members: { include: { user: true } }, tasks: true } 
      });
      res.json(projects);
    } else {
      const projects = await prisma.project.findMany({
        where: { members: { some: { userId: req.user.id } } },
        include: { members: { include: { user: true } }, tasks: true }
      });
      res.json(projects);
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/projects', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    const { name, description, emoji, color, deadline, members, image } = req.body;
    const project = await prisma.project.create({
      data: {
        name, description, emoji, color, image, deadline: deadline ? new Date(deadline) : null, ownerId: req.user.id,
        members: {
          create: (members || []).map((id: string) => ({ userId: id }))
        }
      },
      include: { members: { include: { user: true } }, tasks: true }
    });

    const userName = req.user.name || (await prisma.user.findUnique({ where: { id: req.user.id } }))?.name || 'User';
    await prisma.activity.create({
      data: { text: `${userName} created project "${name}"`, color: project.color }
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/projects/:id', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, description, emoji, color, deadline, members, image } = req.body;
    
    // First, delete existing members
    await prisma.projectMember.deleteMany({ where: { projectId: id } });
    
    // Then update project and re-add members
    const project = await prisma.project.update({
      where: { id },
      data: {
        name, description, emoji, color, image, deadline: deadline ? new Date(deadline) : null,
        members: {
          create: members.map((userId: string) => ({ userId }))
        }
      },
      include: { members: true, tasks: true }
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/projects/:id', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Tasks ---
app.get('/api/tasks', authMiddleware, async (req: any, res: any) => {
  try {
    if (req.user.role === 'admin') {
      const tasks = await prisma.task.findMany();
      res.json(tasks);
    } else {
      const projects = await prisma.project.findMany({
        where: { members: { some: { userId: req.user.id } } },
        select: { id: true }
      });
      const projectIds = projects.map(p => p.id);
      
      const tasks = await prisma.task.findMany({
        where: {
          OR: [
            { assigneeId: req.user.id },
            { projectId: { in: projectIds } }
          ]
        }
      });
      res.json(tasks);
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tasks', authMiddleware, async (req: any, res: any) => {
  try {
    const { title, description, status, priority, dueDate, projectId, assigneeId } = req.body;
    
    // Check access
    if (req.user.role !== 'admin') {
      if (assigneeId && assigneeId !== req.user.id) {
        return res.status(403).json({ error: 'Cannot assign to others' });
      }
    }

    const task = await prisma.task.create({
      data: {
        title, description, status, priority, projectId, assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });
    const userName = req.user.name || (await prisma.user.findUnique({ where: { id: req.user.id } }))?.name || 'User';
    await prisma.activity.create({
      data: { text: `${userName} created task "${title}"`, color: '#3fa4ff' }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/tasks/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate, assigneeId } = req.body;
    
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const isMember = await prisma.projectMember.findFirst({
      where: { projectId: existing.projectId ?? undefined, userId: req.user.id }
    });

    if (req.user.role !== 'admin' && existing.assigneeId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to edit this task. You can only update tasks assigned to you.' });
    }

    const existingTask = await prisma.task.findUnique({ where: { id } });
    const task = await prisma.task.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        description: description !== undefined ? description : existing.description,
        status: status !== undefined ? status : existing.status,
        priority: priority !== undefined ? priority : existing.priority,
        assigneeId: assigneeId !== undefined ? assigneeId : existing.assigneeId,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate
      }
    });
    const userName = req.user.name || (await prisma.user.findUnique({ where: { id: req.user.id } }))?.name || 'User';
    const taskTitle = title || existingTask?.title || 'Task';
    await prisma.activity.create({
      data: { text: `${userName} updated task "${taskTitle}" to ${task.status}`, color: '#e8ff47' }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/tasks/:id', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Users (Admin) ---
app.get('/api/users', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, color: true, joinedAt: true } });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:id/role', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    const { role } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role }
    });
    res.json({ success: true, user: { id: user.id, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Activity ---
app.get('/api/activity', authMiddleware, async (req: any, res: any) => {
  try {
    const activities = await prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/activity', authMiddleware, async (req: any, res: any) => {
  try {
    const { text, color } = req.body;
    const activity = await prisma.activity.create({ data: { text, color } });
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

async function seedUsers() {
  // Seed Admin
  const adminEmail = 'admin@taskflow.io';
  const adminHashedPassword = await bcrypt.hash('Admin123', 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: adminHashedPassword, role: 'admin' },
    create: {
      name: 'Super Admin',
      email: adminEmail,
      password: adminHashedPassword,
      role: 'admin',
      color: '#e8ff47'
    }
  });
  console.log('Admin user seeded');

  // Seed Member
  const memberEmail = 'pushpamkumar669@gmail.com';
  const memberHashedPassword = await bcrypt.hash('Pushp@m009', 10);
  await prisma.user.upsert({
    where: { email: memberEmail },
    update: { password: memberHashedPassword, role: 'member' },
    create: {
      name: 'Pushpam Kumar',
      email: memberEmail,
      password: memberHashedPassword,
      role: 'member',
      color: '#3fa4ff'
    }
  });
  console.log('Demo member seeded');

  // Seed initial activity
  const activities = await prisma.activity.findMany();
  if (activities.length === 0) {
    await prisma.activity.createMany({
      data: [
        { text: 'Super Admin created project "Website Redesign"', color: '#3fa4ff' },
        { text: 'Pushpam Kumar updated task "Implement nav" to Done', color: '#2ecc71' },
        { text: 'Super Admin created task "Design system setup"', color: '#e8ff47' },
      ]
    });
  }
}

app.listen(Number(PORT), '0.0.0.0', async () => {
  await seedUsers();
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
