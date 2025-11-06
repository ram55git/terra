const fs = require('fs');
const path = require('path');

function isPlainObject(v){
  return v && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(en, loc, addedKeys, prefix=''){
  Object.keys(en).forEach(key=>{
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(en[key])){
      if (!isPlainObject(loc[key])) loc[key] = {};
      deepMerge(en[key], loc[key], addedKeys, fullKey);
    } else {
      if (!(key in loc)){
        loc[key] = en[key];
        addedKeys.push(fullKey);
      }
    }
  });
}

function main(){
  const repoRoot = path.resolve(__dirname, '..');
  const localesDir = path.join(repoRoot, 'src', 'locales');
  if (!fs.existsSync(localesDir)){
    console.error('Could not find locales directory:', localesDir);
    process.exit(2);
  }

  const enPath = path.join(localesDir, 'en.json');
  if (!fs.existsSync(enPath)){
    console.error('Could not find en.json at', enPath);
    process.exit(2);
  }

  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const files = fs.readdirSync(localesDir).filter(f=>f.endsWith('.json') && f !== 'en.json');
  const report = [];

  files.forEach(file=>{
    const p = path.join(localesDir, file);
    try{
      const raw = fs.readFileSync(p, 'utf8');
      const obj = JSON.parse(raw);
      const addedKeys = [];
      deepMerge(en, obj, addedKeys);
      if (addedKeys.length){
        fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
        report.push({file, addedKeys});
        console.log(`Updated ${file}: added ${addedKeys.length} keys`);
      } else {
        console.log(`No changes for ${file}`);
      }
    } catch (err){
      console.error(`Failed to process ${file}:`, err.message);
    }
  });

  console.log('\nSummary:');
  if (report.length === 0) console.log('All locale files already had the same keys as en.json');
  else report.forEach(r=>{
    console.log(`- ${r.file}: added ${r.addedKeys.length} keys`);
  });
}

main();
