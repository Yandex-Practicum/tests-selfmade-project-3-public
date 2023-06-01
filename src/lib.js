import'dotenv/config';import fs from'fs';import path from'path';import{request}from'undici';import stylelint from'stylelint';import dirTree from'directory-tree';import{isDirectory}from'@hexlet/immutable-fs-trees';import*as csstree from'css-tree';import compareImages from'resemblejs/compareImages.js';import{getFileData}from'./utils.js';import{hasElementBySelectors,getStyles}from'./puppeteer.js';import stylelintConfig from'./config/stylelint.config.js';const checkStructure=(a,b)=>{const c=dirTree(a,{attributes:['type']}),d=(a,b)=>{const c=a.reduce((a,c)=>{const e=b.find(({name:a,type:b})=>c.name===a&&c.type===b);return e?isDirectory(c)&&e?[...a,...d(c.children,e.children)]:a:[...a,{id:`structure.${c.type}`,values:{name:c.name}}]},[]);return c};return d(b.children,c.children)},checkW3C=async a=>{const b=getFileData(a),c=path.basename(a),{body:d}=await request('https://validator.w3.org/nu/?out=json',{body:b,method:'POST',headers:{"content-type":'text/html; charset=utf-8',"user-agent":'Mozilla/5.0 (platform; rv:geckoversion) Gecko/geckotrail Firefox/firefoxversion'}}),e=await d.json(),f=e.messages.filter(a=>'error'===a.type).map(a=>({id:'w3c',values:{fileName:c,line:a.lastLine,message:a.message}}));return f},checkCSS=async a=>{const b=await stylelint.lint({config:stylelintConfig,files:`${a.split(path.sep).join(path.posix.sep)}**/*.css`// заменить на `${cssPath}**/*.css`
}),c=b.results.reduce((a,b)=>{const c=path.basename(b.source),d=b.warnings.map(a=>({id:`stylelint.${a.rule}`,values:{fileName:c,line:a.line,column:a.column,text:a.text}}));return a.concat(d)},[]);return c},checkOrderStylesheetLinks=async(a,b)=>{const c=b.map(a=>`link[href*="${a}"]`).join(' ~ '),d=await hasElementBySelectors(a,c);return d?[]:[{id:'orderStylesheetLinks'}]},checkAlternativeFonts=(a,b)=>{const c=[],d=getFileData(a),e=csstree.parse(d),f=csstree.findAll(e,a=>'Declaration'===a.type&&'font-family'===a.property),g=f.map(a=>csstree.generate(a)),h=g.filter(a=>!b.some(b=>a.includes(b)));return h.length&&c.push({id:'alternativeFonts',values:{fonts:b.join(', ')}}),c},checkBodyElements=async(a,b)=>{const c=[],d=await a.evaluate(()=>Array.from(window.document.body.childNodes).filter(a=>'#text'!==a.nodeName).map(({tagName:a})=>a.toLowerCase())),e=b.filter(a=>!d.includes(a)),f=d.filter(a=>!b.includes(a));return e.length&&c.push({id:'bodyTagsMissing',values:{names:e.join(', ')}}),f.length&&c.push({id:'bodyTagsExtra',values:{names:f.join(', ')}}),c},checkLang=async(a,b)=>{const c=await hasElementBySelectors(a,`html[lang*=${b}]`);return c?[]:[{id:'langAttrMissing',values:{lang:b}}]},checkTitleEmmet=async a=>{const b=await a.evaluate(()=>document.title);return'Document'===b?[{id:'titleEmmet'}]:[]},checkElementsBySelectors=async(a,b,c)=>{const d=await Promise.all(b.map(async({name:b,selector:c})=>{const d=await hasElementBySelectors(a,c);return{name:b,isMissing:!d}})),e=d.filter(({isMissing:a})=>a),f=e.map(({name:a})=>a);return f.length?[{id:c,values:{names:f.join(', ')}}]:[]},checkPropertiesByElement=async(a,b,c)=>{// const styles = await getStyles(page, selector, Object.keys(properties));
// const res = Object.entries(properties).filter(([name, value]) => (
//   !styles.some((property) => property.name === name && property.value === value)
// ));
// console.log(res);
const d=await getStyles(a,b,Object.keys(c)),e=Object.entries(c).filter(([a,b])=>d[a]!==b).map(([a,b])=>`${a}: ${b}`);return e.length?[{id:'elementProperties',values:{name:b,properties:e.join('; ')}}]:[]},checkVideoAttributes=async(a,b,c)=>{const d=[],e=await a.evaluate(()=>Array.from(document.querySelector('video').attributes).map(({name:a})=>a)),f=b.filter(a=>!e.includes(a)),g=c.filter(a=>e.includes(a));return f.length&&d.push({id:'videoAttributesMissing',values:{names:f.join(', ')}}),g.length&&d.push({id:'videoAttributesExtra',values:{names:g.join(', ')}}),d},checkPseudoElements=a=>{const b=getFileData(a),c=csstree.parse(b),d=csstree.findAll(c,a=>'PseudoClassSelector'===a.type||'PseudoElementSelector'===a.type);return 3>d.length?[{id:'countPseudoElements'}]:[]},checkHorizontalScroll=async a=>{const b=await a.evaluate(()=>window.innerWidth-document.body.clientWidth);return 0===b?[]:[{id:'horizontalScroll'}]},checkLayout=async a=>{await a.hover('h1'),await a.screenshot({path:'layout.jpg',fullPage:!0});const b=await compareImages(fs.readFileSync('./layout-canonical.jpg'),fs.readFileSync('./layout.jpg'),{output:{errorColor:{red:255,green:0,blue:255},errorType:'movement',transparency:.3,largeImageThreshold:0,useCrossOrigin:!1,outputDiff:!0},scaleToSameSize:!0,ignore:'antialiasing'});return fs.writeFileSync('./output.jpg',b.getBuffer(!0)),10<b.misMatchPercentage?[{id:'layoutDifferent'}]:[]};export{checkStructure,checkW3C,checkCSS,checkOrderStylesheetLinks,checkAlternativeFonts,checkBodyElements,checkLang,checkTitleEmmet,checkElementsBySelectors,checkPropertiesByElement,checkVideoAttributes,checkPseudoElements,checkHorizontalScroll,checkLayout};