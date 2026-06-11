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

// GET /auth/researchers  — get all researchers for collaborator selection
exports.getResearchers = async (req, res) => {
  try {
    // Return all users with role researcher or admin (both can be collaborators)
    const researchers = await User.find({ 
      role: { $in: ["researcher", "admin"] },
      isActive: true 
    }).select("-password").sort({ name: 1 });
    res.json({ success: true, researchers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /auth/users  (admin only) — create new user
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, college } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ success: false, message: "Email already registered." });
    const user = await User.create({ name, email, password, role: role || "viewer", college });
    res.status(201).json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, college: user.college } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /auth/me  — update own profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, college, avatar, password, role } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (college) updateData.college = college;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (password) {
      const bcrypt = require("bcryptjs");
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (role) updateData.role = role;
    
    // Check if email is being changed and if it's already taken by another user
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: "Email already registered." });
      }
      updateData.email = email;
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select("-password");
    
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /auth/users/:id  — admin only: update any user's profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, college, avatar, password, role, isActive } = req.body;
    
    // Check if user exists
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (college) updateData.college = college;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (password) {
      const bcrypt = require("bcryptjs");
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Check if email is being changed and if it's already taken by another user
    if (email && email !== targetUser.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: "Email already registered." });
      }
      updateData.email = email;
    }
    
    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select("-password");
    
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /auth/seed  — creates default admin + demo accounts with official ASTU colleges
exports.seed = async (req, res) => {
  try {
    // Delete all seed accounts to force updates if they exist
    const seedEmails = [
      "admin@astu.edu.et", "researcher@astu.edu.et", "viewer@astu.edu.et",
      "tesfaye.worku@astu.edu.et", "almaz.tadesse@astu.edu.et", "biruk.hailu@astu.edu.et",
      "yonas.girma@astu.edu.et", "mekdes.bekele@astu.edu.et", "solomon.bekele@astu.edu.et",
      "hana.tesfaye@astu.edu.et", "getachew.mengistu@astu.edu.et", "robel.tadesse@astu.edu.et",
      "chaltu.wakjira@astu.edu.et", "fikirte.haile@astu.edu.et", "dawit.asfaw@astu.edu.et",
      "selamawit.girma@astu.edu.et", "tesfaye.demissie@astu.edu.et"
    ];
    await User.deleteMany({ email: { $in: seedEmails } });

    await User.create([
      { name: "Abebe Kebede", email: "admin@astu.edu.et", password: "admin1234", role: "admin", college: "Administration" },
      { name: "Dr. Tigist Alemu", email: "researcher@astu.edu.et", password: "research1234", role: "researcher", college: "College of Electrical Engineering & Computing" },
      { name: "Dawit Haile", email: "viewer@astu.edu.et", password: "viewer1234", role: "viewer", college: "College of Applied Natural Science" },
      // Add 14 researchers from college-service
      { name: "Dr. Tesfaye Worku", email: "tesfaye.worku@astu.edu.et", password: "research1234", role: "researcher", college: "College of Electrical Engineering & Computing" },
      { name: "Prof. Almaz Tadesse", email: "almaz.tadesse@astu.edu.et", password: "research1234", role: "researcher", college: "College of Mechanical, Chemical & Materials Engineering" },
      { name: "Dr. Biruk Hailu", email: "biruk.hailu@astu.edu.et", password: "research1234", role: "researcher", college: "College of Civil Engineering and Architecture" },
      { name: "Dr. Yonas Girma", email: "yonas.girma@astu.edu.et", password: "research1234", role: "researcher", college: "College of Electrical Engineering & Computing" },
      { name: "Prof. Mekdes Bekele", email: "mekdes.bekele@astu.edu.et", password: "research1234", role: "researcher", college: "College of Applied Natural Science" },
      { name: "Dr. Solomon Bekele", email: "solomon.bekele@astu.edu.et", password: "research1234", role: "researcher", college: "College of Electrical Engineering & Computing" },
      { name: "Dr. Hana Tesfaye", email: "hana.tesfaye@astu.edu.et", password: "research1234", role: "researcher", college: "College of Electrical Engineering & Computing" },
      { name: "Prof. Getachew Mengistu", email: "getachew.mengistu@astu.edu.et", password: "research1234", role: "researcher", college: "College of Applied Natural Science" },
      { name: "Dr. Robel Tadesse", email: "robel.tadesse@astu.edu.et", password: "research1234", role: "researcher", college: "College of Electrical Engineering & Computing" },
      { name: "Dr. Chaltu Wakjira", email: "chaltu.wakjira@astu.edu.et", password: "research1234", role: "researcher", college: "College of Applied Natural Science" },
      { name: "Dr. Fikirte Haile", email: "fikirte.haile@astu.edu.et", password: "research1234", role: "researcher", college: "College of Applied Natural Science" },
      { name: "Prof. Dawit Asfaw", email: "dawit.asfaw@astu.edu.et", password: "research1234", role: "researcher", college: "College of Mechanical, Chemical & Materials Engineering" },
      { name: "Dr. Selamawit Girma", email: "selamawit.girma@astu.edu.et", password: "research1234", role: "researcher", college: "College of Humanities and Social Science" },
      { name: "Prof. Tesfaye Demissie", email: "tesfaye.demissie@astu.edu.et", password: "research1234", role: "researcher", college: "College of Humanities and Social Science" },
    ]);
    res.json({ success: true, message: "Default users seeded successfully with official ASTU colleges and 14 researchers." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
