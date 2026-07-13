const bcrypt = require("bcryptjs");        // password scrambler
const jwt = require("jsonwebtoken");       // wristband maker
const { z } = require("zod");              // the doorman's checklist
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();         // the pen that writes in the notebooks

// The checklist: real email + password of 6+ characters
// (same rules your frontend already checks on the Auth page)
const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

// ---------- REGISTER: a new customer joins ----------
async function register(req, res) {
  // 1. Check the paper they gave us
  const body = authSchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Bad email or password (min 6 characters)" });
  }
  const { email, password, name } = body.data;

  // 2. Is this email already in the notebook?
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return res.status(409).json({ error: "Email already used" });
  }

  // 3. Scramble the password, write the new user in the notebook
  const user = await prisma.user.create({
    data: {
      email,
      name: name || email.split("@")[0],   // no name given? use "alex" from "alex@..."
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  // 4. Give them a wristband that lasts 7 days
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

  // 5. Send back the user (NEVER the password!) + the wristband
  res.json({
    user: { id: user.id, name: user.name, email: user.email, plan: user.plan, avatar: user.avatar },
    token,
  });
}

// ---------- LOGIN: a customer comes back ----------
async function login(req, res) {
  const body = authSchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Bad email or password" });
  }

  // Find them in the notebook and compare scrambled passwords
  const user = await prisma.user.findUnique({ where: { email: body.data.email } });
  const passwordOk = user && (await bcrypt.compare(body.data.password, user.passwordHash));
  if (!passwordOk) {
    return res.status(401).json({ error: "Wrong email or password" });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({
    user: { id: user.id, name: user.name, email: user.email, plan: user.plan, avatar: user.avatar },
    token,
  });
}

// ---------- THE WRISTBAND CHECK: guards every private room ----------
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  try {
    req.userId = jwt.verify(token, process.env.JWT_SECRET).userId; // reads who they are
    next();                                                        // wristband good → come in
  } catch {
    res.status(401).json({ error: "Please log in" });              // fake/expired → stopped
  }
}

module.exports = { register, login, requireAuth };
