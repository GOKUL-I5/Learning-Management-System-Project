const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
  { regex: /createCollegeAdmin/g, replace: 'createOrganizationAdmin' },
  { regex: /getCollegeStudents/g, replace: 'getOrganizationStudents' },
  { regex: /getCollegeStaff/g, replace: 'getOrganizationStaff' },
  { regex: /deleteCollegeDoc/g, replace: 'deleteOrganizationDoc' },
  { regex: /createCollege/g, replace: 'createOrganization' },
  { regex: /getColleges/g, replace: 'getOrganizations' },
  { regex: /collegeId/g, replace: 'organizationId' },
  { regex: /collegeName/g, replace: 'organizationName' },
  { regex: /colleges/g, replace: 'organizations' },
  { regex: /Colleges/g, replace: 'Organizations' },
  { regex: /College/g, replace: 'Organization' },
  { regex: /college/g, replace: 'organization' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let original = content;
      for (const r of replacements) {
        content = content.replace(r.regex, r.replace);
      }
      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
      }
    }
  }
}

processDirectory(directoryPath);
console.log('Rebranding complete.');
