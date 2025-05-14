const readline = require('readline');
const { enrollAdmin } = require('./enroll-helper');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function promptOrg() {
  console.log('=== Enroll Admin ===');
  console.log('[1] Akademik');
  console.log('[2] Rektor');
  rl.question('Pilih organisasi (1/2): ', async (answer) => {
    switch (answer.trim()) {
      case '1':
        await enrollAdmin(
          'akademik',
          'admin-akademik',
          'adminpw',
          'AkademikMSP',
          'config/connection-akademik.json'
        );
        break;
      case '2':
        await enrollAdmin(
          'rektor',
          'admin-rektor',
          'adminpw',
          'RektorMSP',
          'config/connection-rektor.json'
        );
        break;
      default:
        console.log('❌ Pilihan tidak valid.');
    }
    rl.close();
  });
}

promptOrg();
