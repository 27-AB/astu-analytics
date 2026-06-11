const router = require("express").Router();
const { register, login, getMe, getUsers, updateRole, seed, getResearchers, createUser, updateProfile, updateUserProfile } = require("../controllers/authController");
const { protect, requireRole } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/me", protect, updateProfile);
router.get("/users", protect, requireRole("admin"), getUsers);
router.post("/users", protect, requireRole("admin"), createUser);
router.put("/users/:id", protect, requireRole("admin"), updateUserProfile);
router.put("/users/:id/role", protect, requireRole("admin"), updateRole);
router.get("/researchers", protect, getResearchers);
router.post("/seed", seed);

module.exports = router;
