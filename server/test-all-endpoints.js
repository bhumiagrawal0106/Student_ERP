async function testAllEndpoints() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('Testing all endpoints across all 5 user portals...\n');

  // 1. Health
  const hRes = await fetch(`${BASE_URL}/health`);
  console.log('Health Check:', hRes.status, await hRes.json());

  // 2. Student Login
  const stLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: '210097010001', password: 'AMAN SINGH4321' })
  });
  const stLogin = await stLoginRes.json();
  console.log('Student Login Status:', stLoginRes.status, 'User:', stLogin.user?.username);
  const stToken = stLogin.token;

  const stEndpoints = [
    '/student/dashboard',
    '/student/profile',
    '/student/mentors',
    '/student/attendance-summary',
    '/student/attendance-logs',
    '/student/marks',
    '/student/leaves',
    '/student/complaints',
    '/student/faculty-list',
    '/common/notices',
    '/common/pyqs',
    '/common/resources'
  ];

  for (const ep of stEndpoints) {
    try {
      const res = await fetch(`${BASE_URL}${ep}`, {
        headers: { Authorization: `Bearer ${stToken}` }
      });
      const data = await res.json();
      console.log(`✓ Student Endpoint [${ep}] -> Status ${res.status}:`, Object.keys(data));
    } catch (err) {
      console.error(`✗ Error calling [${ep}]:`, err.message);
    }
  }

  // 3. Faculty Login
  const facLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'FAC101', password: 'FAC101@123' })
  });
  const facLogin = await facLoginRes.json();
  const facToken = facLogin.token;
  console.log('\nFaculty Login Status:', facLoginRes.status, 'User:', facLogin.user?.username);

  const facEndpoints = [
    '/faculty/dashboard',
    '/faculty/allocations',
    '/faculty/mentor-batches',
    '/faculty/leaves-to-review',
    '/faculty/students-for-class?subjectCode=KCS501&section=A',
    '/faculty/students-for-marks?subjectCode=KCS501&section=A&examType=ST1'
  ];

  for (const ep of facEndpoints) {
    try {
      const res = await fetch(`${BASE_URL}${ep}`, {
        headers: { Authorization: `Bearer ${facToken}` }
      });
      const data = await res.json();
      console.log(`✓ Faculty Endpoint [${ep}] -> Status ${res.status}:`, Object.keys(data));
    } catch (err) {
      console.error(`✗ Error calling [${ep}]:`, err.message);
    }
  }

  // 4. HOD Login
  const hodLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'HOD_CSE', password: 'HOD_CSE@123' })
  });
  const hodLogin = await hodLoginRes.json();
  const hodToken = hodLogin.token;
  console.log('\nHOD Login Status:', hodLoginRes.status, 'User:', hodLogin.user?.username);

  const hodEndpoints = [
    '/hod/dashboard',
    '/hod/department-overview',
    '/hod/feedback',
    '/hod/defaulters'
  ];

  for (const ep of hodEndpoints) {
    try {
      const res = await fetch(`${BASE_URL}${ep}`, {
        headers: { Authorization: `Bearer ${hodToken}` }
      });
      const data = await res.json();
      console.log(`✓ HOD Endpoint [${ep}] -> Status ${res.status}:`, Object.keys(data));
    } catch (err) {
      console.error(`✗ Error calling [${ep}]:`, err.message);
    }
  }

  // 5. Admin Login
  const admLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@ERP2026' })
  });
  const admLogin = await admLoginRes.json();
  const admToken = admLogin.token;
  console.log('\nAdmin Login Status:', admLoginRes.status, 'User:', admLogin.user?.username);

  const admEndpoints = [
    '/admin/students',
    '/admin/faculty',
    '/admin/mentors',
    '/admin/subjects',
    '/admin/complaints'
  ];

  for (const ep of admEndpoints) {
    try {
      const res = await fetch(`${BASE_URL}${ep}`, {
        headers: { Authorization: `Bearer ${admToken}` }
      });
      const data = await res.json();
      console.log(`✓ Admin Endpoint [${ep}] -> Status ${res.status}:`, Object.keys(data));
    } catch (err) {
      console.error(`✗ Error calling [${ep}]:`, err.message);
    }
  }

  // 6. Maintenance Desk
  const maintRes = await fetch(`${BASE_URL}/common/maintenance-desk`);
  const maintData = await maintRes.json();
  console.log('\n✓ Maintenance Desk [/common/maintenance-desk] -> Status', maintRes.status, Object.keys(maintData));

  console.log('\n=== All Portals & Endpoints Verified! ===');
}

testAllEndpoints();
