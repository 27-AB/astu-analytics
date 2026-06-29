const router = require("express").Router();
const { 
  register, login, getMe, getUsers, updateRole, seed, 
  updateProfile, adminCreateUser, adminUpdateUserProfile 
} = require("../controllers/authController");
const { protect, requireRole } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);

// User profile self-update
router.put("/profile", protect, updateProfile);

// Admin controls
router.get("/users", protect, requireRole("admin"), getUsers);
router.post("/users", protect, requireRole("admin"), adminCreateUser);
router.put("/users/:id", protect, requireRole("admin"), adminUpdateUserProfile);
router.put("/users/:id/role", protect, requireRole("admin"), updateRole);
router.post("/seed", seed);

module.exports = router;

