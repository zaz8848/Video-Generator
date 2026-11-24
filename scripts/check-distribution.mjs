import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const staged=execFileSync('git',['-C',root,'ls-files','--cached','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
assert.ok(staged.length,'Stage the intended distribution before checking');
const forbidden=/(?:^|\/)(?:node_modules|\.runtime|\.git|sessions|deliverables|\.venv-windows|\.venv-posix)(?:\/|$)|(?:^|\/)\.env(?:\.|$)|\.local\.(?:env|json)$|\.(?:pem|pfx|p12|key)$/i;
const config=path.join(root,'profiles/tts.local.env');
const local=fs.existsSync(config)?parseEnv(fs.readFileSync(config,'utf8')):{};
const secrets=Object.entries(local).filter(([key,value])=>/key|secret|token|password/i.test(key)&&typeof value==='string'&&value.length>=16).map(([,value])=>Buffer.from(value));
const findings=[];
let bytes=0;
for(const file of staged){
    if(forbidden.test(file)||(file.startsWith('profiles/')&&file!=='profiles/tts.env.example')) findings.push({file,reason:'excluded local resource'});
    const full=path.join(root,file),stat=fs.lstatSync(full);
    if(!stat.isFile()||stat.isSymbolicLink()){findings.push({file,reason:'non-regular file'});continue;}
    const content=fs.readFileSync(full);bytes+=content.length;
    if(content.length>=100*1024*1024)findings.push({file,reason:'GitHub file size limit'});
    if(secrets.some(secret=>content.includes(secret)))findings.push({file,reason:'local credential found; value redacted'});
    if(/(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(content.toString('utf8')))findings.push({file,reason:'high-confidence credential pattern; value redacted'});
}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'plugin.json'),'utf8'));
assert.equal(manifest.$schema,'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
const names=['video-configure','video-create','video-adu','video-voice','video-review'];
assert.deepEqual(fs.readdirSync(path.join(root,'skills')).sort(),names.toSorted());
let links=0;
for(const file of [...names.map(name=>`skills/${name}/SKILL.md`),...fs.readdirSync(path.join(root,'com.github.copilot/rules')).map(name=>'com.github.copilot/rules/'+name)]){
    assert.ok(staged.includes(file),'Missing staged plugin entry: '+file);
    const text=fs.readFileSync(path.join(root,file),'utf8');
    assert.ok(text.startsWith('---')&&text.includes('description:'));
    for(const match of text.matchAll(/\]\(([^)]+)\)/g)){
        assert.ok(fs.existsSync(path.resolve(root,path.dirname(file),match[1])),'Broken plugin route: '+file);links++;
    }
}
if(findings.length){console.error(JSON.stringify({passed:false,findings},null,2));process.exitCode=1;}
else console.log(JSON.stringify({passed:true,stagedFiles:staged.length,totalBytes:bytes,pluginSkills:names.length,rules:2,routeLinksVerified:links,excludedResourcesAbsent:true,knownCredentialValuesChecked:secrets.length,credentialsPrinted:false,remoteOperations:false},null,2));