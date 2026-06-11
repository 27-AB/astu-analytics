const { College, Researcher } = require("../models/College");

exports.getColleges = async (req, res) => {
  try {
    const colleges = await College.find().sort({ name: 1 }).maxTimeMS(5000);
    res.json({ success: true, total: colleges.length, colleges });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getResearchers = async (req, res) => {
  try {
    const { college, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (college) query.college = new RegExp(college, "i");
    if (search)  query.$or = [{ name: new RegExp(search, "i") }, { specialization: new RegExp(search, "i") }];
    const researchers = await Researcher.find(query).sort({ publications: -1 }).skip((page - 1) * limit).limit(Number(limit)).maxTimeMS(5000);
    const total = researchers.length;
    res.json({ success: true, total, researchers });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// DELETE and re-seed so correct colleges replace wrong ones
exports.seed = async (req, res) => {
  try {
    // Always wipe and re-seed so corrections take effect
    await College.deleteMany({});
    await Researcher.deleteMany({});

    await College.insertMany([
      {
        name: "College of Electrical Engineering & Computing",
        shortName: "CEEC",
        dean: "Prof. Girma Tesfaye",
        established: 1993,
        color: "#3b82f6",
        departments: ["Computer Science & Engineering", "Electrical & Computer Engineering", "Software Engineering", "Information Technology", "Computer Networks"],
        description: "The largest college at ASTU, leading research and education in computing, software, and electrical systems for Ethiopia's digital transformation."
      },
      {
        name: "College of Mechanical, Chemical & Materials Engineering",
        shortName: "CMCME",
        dean: "Prof. Almaz Tadesse",
        established: 1994,
        color: "#f59e0b",
        departments: ["Mechanical Engineering", "Chemical Engineering", "Materials Science & Engineering", "Industrial Engineering", "Manufacturing Engineering"],
        description: "Advancing engineering solutions in manufacturing, energy, materials and industrial processes to drive Ethiopia's industrialisation agenda."
      },
      {
        name: "College of Civil Engineering and Architecture",
        shortName: "CCEA",
        dean: "Dr. Biruk Hailu",
        established: 1995,
        color: "#10b981",
        departments: ["Civil Engineering", "Architecture", "Urban & Regional Planning", "Construction Technology & Management", "Geotechnical Engineering"],
        description: "Building Ethiopia's future through excellence in infrastructure design, urban planning, and sustainable construction practices."
      },
      {
        name: "College of Applied Natural Science",
        shortName: "CANS",
        dean: "Prof. Mekdes Bekele",
        established: 1996,
        color: "#8b5cf6",
        departments: ["Mathematics", "Physics", "Chemistry", "Biology & Biotechnology", "Statistics", "Earth Sciences", "Environmental Science"],
        description: "Providing foundational and applied science education supporting research across all engineering and health disciplines at ASTU."
      },
      {
        name: "College of Humanities and Social Science",
        shortName: "CHSS",
        dean: "Dr. Nardos Hailu",
        established: 2004,
        color: "#06b6d4",
        departments: ["Sociology", "Psychology", "History", "Journalism & Communication", "Ethiopian Languages & Literature", "Foreign Languages", "Civics & Ethical Studies"],
        description: "Developing critical thinkers and communicators who bridge the gap between technology and society at Adama Science and Technology University."
      },
      {
        name: "Postgraduate Programs",
        shortName: "PG",
        dean: "Prof. Getachew Mengistu",
        established: 2005,
        color: "#ef4444",
        departments: ["MSc Computer Science", "MSc Electrical Engineering", "MSc Civil Engineering", "MSc Applied Mathematics", "PhD Engineering", "MSc Environmental Science", "MBA"],
        description: "ASTU's graduate school offering advanced MSc and PhD programmes across all engineering and applied science disciplines."
      },
    ]);

    await Researcher.insertMany([
      { name: "Dr. Tesfaye Worku",    title: "Dr.",   college: "College of Electrical Engineering & Computing",          department: "Computer Science & Engineering",    email: "tesfaye.worku@astu.edu.et",    specialization: ["Artificial Intelligence", "Computer Vision", "Machine Learning"],       publications: 18, activeProjects: 3 },
      { name: "Prof. Almaz Tadesse",  title: "Prof.", college: "College of Mechanical, Chemical & Materials Engineering", department: "Chemical Engineering",               email: "almaz.tadesse@astu.edu.et",    specialization: ["Water Treatment", "Solar Energy", "Environmental Engineering"],         publications: 32, activeProjects: 2 },
      { name: "Dr. Biruk Hailu",      title: "Dr.",   college: "College of Civil Engineering and Architecture",           department: "Civil Engineering",                  email: "biruk.hailu@astu.edu.et",      specialization: ["Structural Engineering", "Seismic Analysis", "Urban Infrastructure"],   publications: 14, activeProjects: 2 },
      { name: "Dr. Yonas Girma",      title: "Dr.",   college: "College of Electrical Engineering & Computing",          department: "Computer Science & Engineering",    email: "yonas.girma@astu.edu.et",      specialization: ["Blockchain", "Distributed Systems", "Cybersecurity"],                  publications: 11, activeProjects: 1 },
      { name: "Prof. Mekdes Bekele",  title: "Prof.", college: "College of Applied Natural Science",                      department: "Biology & Biotechnology",            email: "mekdes.bekele@astu.edu.et",    specialization: ["Genomics", "Biotechnology", "Plant Science"],                           publications: 41, activeProjects: 2 },
      { name: "Dr. Solomon Bekele",   title: "Dr.",   college: "College of Electrical Engineering & Computing",          department: "Electrical & Computer Engineering", email: "solomon.bekele@astu.edu.et",   specialization: ["Renewable Energy", "Wind Power", "Power Systems"],                     publications: 22, activeProjects: 1 },
      { name: "Dr. Hana Tesfaye",     title: "Dr.",   college: "College of Electrical Engineering & Computing",          department: "Computer Science & Engineering",    email: "hana.tesfaye@astu.edu.et",     specialization: ["Natural Language Processing", "Amharic NLP", "Deep Learning"],         publications: 15, activeProjects: 2 },
      { name: "Prof. Getachew Mengistu", title: "Prof.", college: "College of Applied Natural Science",                   department: "Earth Sciences",                     email: "getachew.mengistu@astu.edu.et",specialization: ["Geothermal Energy", "Geology", "Geophysics"],                           publications: 38, activeProjects: 1 },
      { name: "Dr. Robel Tadesse",    title: "Dr.",   college: "College of Electrical Engineering & Computing",          department: "Electrical & Computer Engineering", email: "robel.tadesse@astu.edu.et",    specialization: ["IoT", "Smart Systems", "Embedded Systems"],                            publications: 9,  activeProjects: 2 },
      { name: "Dr. Chaltu Wakjira",   title: "Dr.",   college: "College of Applied Natural Science",                     department: "Biology & Biotechnology",            email: "chaltu.wakjira@astu.edu.et",   specialization: ["Ethnopharmacology", "Traditional Medicine", "Drug Discovery"],         publications: 19, activeProjects: 2 },
      { name: "Dr. Fikirte Haile",    title: "Dr.",   college: "College of Applied Natural Science",                     department: "Environmental Science",              email: "fikirte.haile@astu.edu.et",    specialization: ["Remote Sensing", "Climate Change", "GIS"],                             publications: 16, activeProjects: 2 },
      { name: "Prof. Dawit Asfaw",    title: "Prof.", college: "College of Mechanical, Chemical & Materials Engineering", department: "Chemical Engineering",               email: "dawit.asfaw@astu.edu.et",      specialization: ["Biogas", "Waste-to-Energy", "Anaerobic Digestion"],                    publications: 27, activeProjects: 1 },
      { name: "Dr. Selamawit Girma",  title: "Dr.",   college: "College of Humanities and Social Science",               department: "Sociology",                          email: "selamawit.girma@astu.edu.et",  specialization: ["Entrepreneurship", "Women Empowerment", "Development Economics"],      publications: 12, activeProjects: 1 },
      { name: "Prof. Tesfaye Demissie", title: "Prof.", college: "College of Humanities and Social Science",             department: "Journalism & Communication",          email: "tesfaye.demissie@astu.edu.et", specialization: ["Media Studies", "Digital Communication", "Public Relations"],          publications: 21, activeProjects: 1 },
    ]);

    res.json({ success: true, message: "Colleges and researchers seeded with correct ASTU data." });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
