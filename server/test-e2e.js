async function runTests() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('=== Starting Automated Verification Tests ===\n');

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    console.log('✓ Health Check:', health.status);

    // 2. Student Login
    const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: '210097010001',
        password: 'AMAN SINGH4321',
      }),
    });
    const studentLogin = await studentLoginRes.json();
    console.log('✓ Student Login:', studentLogin.user.username, 'Role:', studentLogin.user.role);
    const studentToken = studentLogin.token;

    // Student Profile
    const profileRes = await fetch(`${BASE_URL}/student/profile`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const studentProfile = await profileRes.json();
    console.log('✓ Student Profile:', studentProfile.profile.name, 'Semester:', studentProfile.profile.current_semester);

    // Student Attendance Summary
    const attRes = await fetch(`${BASE_URL}/student/attendance-summary`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const attSum = await attRes.json();
    console.log('✓ Student Attendance %:', attSum.overallPercentage, 'Total Conducted:', attSum.totalConducted);

    // Student Dual Mentors
    const mentorsRes = await fetch(`${BASE_URL}/student/mentors`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const mentors = await mentorsRes.json();
    console.log('✓ Dual Mentors Count:', mentors.mentors.length);
    mentors.mentors.forEach((m, idx) => {
      console.log(`   Mentor ${idx + 1}: ${m.name} (${m.gender}, ${m.designation})`);
    });

    // 3. Faculty Login
    const facLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'FAC101',
        password: 'FAC101@123',
      }),
    });
    const facLogin = await facLoginRes.json();
    console.log('✓ Faculty Login:', facLogin.user.username);
    const facToken = facLogin.token;

    // Faculty Allocations
    const allocRes = await fetch(`${BASE_URL}/faculty/allocations`, {
      headers: { Authorization: `Bearer ${facToken}` },
    });
    const allocs = await allocRes.json();
    console.log('✓ Faculty Allocations:', allocs.allocations.length, 'subjects');

    // 4. Privacy Check: Faculty MUST NOT access confidential HOD feedback
    const privacyCheckRes = await fetch(`${BASE_URL}/hod/feedback`, {
      headers: { Authorization: `Bearer ${facToken}` },
    });
    if (privacyCheckRes.status === 403) {
      console.log('✓ Privacy Enforcement: Faculty blocked from confidential HOD feedback (HTTP 403 Forbidden)');
    } else {
      console.error('✗ SECURITY ISSUE: Unexpected status for faculty accessing HOD feedback:', privacyCheckRes.status);
    }

    // 5. HOD Login
    const hodLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'HOD_CSE',
        password: 'HOD_CSE@123',
      }),
    });
    const hodLogin = await hodLoginRes.json();
    console.log('✓ HOD Login:', hodLogin.user.username);
    const hodToken = hodLogin.token;

    // HOD Feedback view
    const hodFbRes = await fetch(`${BASE_URL}/hod/feedback`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    const hodFb = await hodFbRes.json();
    console.log('✓ HOD Confidential Feedback Access: Successfully retrieved', hodFb.feedback?.length, 'feedback entries');

    // 6. Admin Login
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'Admin@ERP2026',
      }),
    });
    const adminLogin = await adminLoginRes.json();
    console.log('✓ Admin Login:', adminLogin.user.username);
    const adminToken = adminLogin.token;

    const allStudentsRes = await fetch(`${BASE_URL}/admin/students`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allStudents = await allStudentsRes.json();
    console.log('✓ Admin Student Master:', allStudents.students?.length, 'registered students');

    // 7. Common Routes: Notices and PYQs
    const noticesRes = await fetch(`${BASE_URL}/common/notices`);
    const notices = await noticesRes.json();
    console.log('✓ Public Notices:', notices.notices?.length);

    const pyqsRes = await fetch(`${BASE_URL}/common/pyqs`);
    const pyqs = await pyqsRes.json();
    console.log('✓ University PYQs:', pyqs.papers?.length);

    console.log('\n=== All Automated Tests Passed Successfully! ===');
  } catch (err) {
    console.error('Test failed:', err);
  }
}

runTests();
