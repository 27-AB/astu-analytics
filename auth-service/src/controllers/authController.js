const jwt = require("jsonwebtoken");
const User = require("../models/User");

const sign = (user) =>
  jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: "7d" });

// POST /auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, college } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ success: false, message: "Email already registered." });
    const user = await User.create({ name, email, password, role: role || "viewer", college });
    res.status(201).json({ success: true, token: sign(user), user: { id: user._id, name: user.name, email: user.email, role: user.role, college: user.college } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    if (!user.isActive)
      return res.status(403).json({ success: false, message: "Account deactivated." });
    res.json({ success: true, token: sign(user), user: { id: user._id, name: user.name, email: user.email, role: user.role, college: user.college } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /auth/users  (admin only)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ success: true, total: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /auth/users/:id/role  (admin only) — change a user's role
exports.updateRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["admin", "researcher", "viewer"].includes(role))
      return res.status(400).json({ success: false, message: "Invalid role. Must be admin, researcher, or viewer." });
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    res.json({ success: true, message: `Role updated to ${role}.`, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /auth/seed  — creates default admin + demo accounts with official ASTU colleges
exports.seed = async (req, res) => {
  try {
    // Delete existing default accounts to force updates if they exist
    await User.deleteMany({ email: { $in: ["admin@astu.edu.et", "researcher@astu.edu.et", "viewer@astu.edu.et"] } });

    await User.create([
      { name: "Abebe Kebede", email: "admin@astu.edu.et", password: "admin1234", role: "admin", college: "Administration" },
      { name: "Dr. Tigist Alemu", email: "researcher@astu.edu.et", password: "research1234", role: "researcher", college: "College of Electrical Engineering & Computing" },
      { name: "Dawit Haile", email: "viewer@astu.edu.et", password: "viewer1234", role: "viewer", college: "College of Applied Natural Science" },
    ]);
    res.json({ success: true, message: "Default users seeded successfully with official ASTU colleges." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, password, college } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    if (email && email !== user.email) {
      if (await User.findOne({ email })) {
        return res.status(400).json({ success: false, message: "Email is already in use." });
      }
      user.email = email;
    }
    if (name) user.name = name;
    if (college !== undefined) user.college = college;
    if (password) user.password = password;

    await user.save();
    res.json({ 
      success: true, 
      message: "Profile updated successfully.",
      token: sign(user),
      user: { id: user._id, name: user.name, email: user.email, role: user.role, college: user.college }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /auth/users (admin only)
exports.adminCreateUser = async (req, res) => {
  try {
    const { name, email, password, role, college } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }
    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: "Email already registered." });
    }
    const user = await User.create({ name, email, password, role, college });
    res.status(201).json({ 
      success: true, 
      message: "User created successfully.", 
      user: { id: user._id, name: user.name, email: user.email, role: user.role, college: user.college } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /auth/users/:id (admin only)
exports.adminUpdateUserProfile = async (req, res) => {
  try {
    const { name, email, role, college, isActive, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    if (email && email !== user.email) {
      if (await User.findOne({ email })) {
        return res.status(400).json({ success: false, message: "Email is already in use." });
      }
      user.email = email;
    }
    if (name) user.name = name;
    if (role) user.role = role;
    if (college !== undefined) user.college = college;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password;

    await user.save();
    res.json({ 
      success: true, 
      message: "User profile updated successfully.",
      user: { id: user._id, name: user.name, email: user.email, role: user.role, college: user.college, isActive: user.isActive }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

