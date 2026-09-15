import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Check, CheckCheck, ChevronDown, CircleHelp, FileImage, FileSpreadsheet, FolderOpen, Globe2, Grid2X2, Image, Laptop, Link2, List, LoaderCircle, LockKeyhole, Monitor, Plus, Scan, ScanLine, Search, Settings2, ShieldCheck, Smartphone, Sparkles, Square, Tablet, Trash2, Upload, WandSparkles, X } from 'lucide-react';
import { devices } from './lib/types';
import type { CaptureItem, CaptureOptions, Device, SessionInfo, Template } from './lib/types';
import { parseUrls, readUrlFile } from './lib/urls';
import { downloadBlob, exportDocument } from './lib/export';
import { deleteProject, getProjects, saveProject } from './lib/storage';
import type { Project } from './lib/storage';
import { getInitialLocale, installTranslations, setSavedLocale } from './lib/i18n';
import type { Locale } from './lib/i18n';
import './i18n.css';

const newId=()=>crypto.randomUUID();
const defaultOptions:CaptureOptions={mode:'viewport',device:'desktop',clean:true,selector:'',concurrency:3};
const deviceIcons={desktop:Monitor,laptop:Laptop,tablet:Tablet,mobile:Smartphone};
const makeItem=(url:string):CaptureItem=>({id:newId(),url,title:new URL(url).hostname,status:'queued',note:'',selected:true});
const isDesktop=Boolean(window.snapdeck);

export default function App(){
  const [locale,setLocale]=useState<Locale>(getInitialLocale);
  const [view,setView]=useState<'studio'|'library'>('studio');
  const [input,setInput]=useState('');
  const [items,setItems]=useState<CaptureItem[]>([]);
  const [options,setOptions]=useState<CaptureOptions>(defaultOptions);
  const [template,setTemplate]=useState<Template>('detail');
  const [format,setFormat]=useState<'pptx'|'xlsx'>('pptx');
  const [title,setTitle]=useState(()=>getInitialLocale()==='ko'?'새로운 리서치':'New Research');
  const [running,setRunning]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [notice,setNotice]=useState('');
  const [modal,setModal]=useState<'help'|'desktop'|'sessions'|null>(null);
  const [preview,setPreview]=useState<string|null>(null);
  const [projects,setProjects]=useState<Project[]>([]);
  const [projectId,setProjectId]=useState<string>(newId());
  const [filter,setFilter]=useState<'all'|'done'|'error'>('all');
  const [layout,setLayout]=useState<'grid'|'list'>('grid');
  const [search,setSearch]=useState('');
  const [dragging,setDragging]=useState(false);
  const [sessions,setSessions]=useState<SessionInfo[]>([]);
  const [sessionUrl,setSessionUrl]=useState('');
  const [sessionBusy,setSessionBusy]=useState(false);
  const [demoLoading,setDemoLoading]=useState(false);
  const fileInput=useRef<HTMLInputElement>(null),imageInput=useRef<HTMLInputElement>(null);
  const stopped=useRef(false);
  const parsed=parseUrls(input);
  const done=items.filter(i=>i.status==='done'), selected=done.filter(i=>i.selected), failures=items.filter(i=>i.status==='error');
  const currentPreview=items.find(i=>i.id===preview);
  const notify=(text:string)=>setNotice(text);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),6500);return()=>clearTimeout(timer);},[notice]);
  useEffect(()=>installTranslations(locale),[locale]);
  useEffect(()=>window.snapdeck?.onProgress(update=>setItems(old=>old.map(i=>i.id===update.id?{...i,...update}:i))),[]);
  useEffect(()=>{
    if(!modal&&!preview)return;
    const before=document.activeElement as HTMLElement;
    const handler=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){setModal(null);setPreview(null);}
      if(event.key==='Tab'){
        const nodes=[...document.querySelectorAll<HTMLElement>('.modal button:not(:disabled),.modal a[href],.modal input:not(:disabled),.modal select')];
        const first=nodes[0],last=nodes.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    window.addEventListener('keydown',handler);return()=>{window.removeEventListener('keydown',handler);before?.focus();};
  },[modal,preview]);

  async function importFile(file?:File){if(!file)return;try{setInput(await readUrlFile(file));notify(`${file.name} 파일을 불러왔습니다.`);}catch(e){notify((e as Error).message);}}
  function addUrls(){
    if(!parsed.urls.length){notify('올바른 URL을 입력해 주세요.');return;}
    const existing=new Set(items.map(i=>i.url)),fresh=parsed.urls.filter(url=>!existing.has(url));
    if(items.length+fresh.length>300){notify('한 프로젝트에는 최대 300개 URL을 추가할 수 있습니다.');return;}
    setItems(old=>[...old,...fresh.map(makeItem)]);setInput('');notify(`${fresh.length}개 URL 추가 · ${parsed.duplicates+parsed.urls.length-fresh.length}개 중복 제외${parsed.invalid.length?` · ${parsed.invalid.length}개 형식 오류 제외`:''}`);
  }
  async function startCapture(){
    if(!isDesktop){setModal('desktop');return;}
    let next=items;
    if(parsed.urls.length){const known=new Set(items.map(i=>i.url));next=[...items,...parsed.urls.filter(url=>!known.has(url)).map(makeItem)];setInput('');}
    if(next.length>300){notify('한 번에 최대 300개 URL을 처리할 수 있습니다.');return;}
    const queue=next.filter(i=>i.status==='queued'||i.status==='error');
    if(!queue.length){notify('캡처할 URL을 추가해 주세요.');return;}
    if(options.mode==='selector'&&!options.selector.trim()){notify('캡처할 CSS 선택자를 입력해 주세요.');return;}
    setItems(next);setRunning(true);stopped.current=false;
    try{await window.snapdeck!.capture(queue.map(({id,url})=>({id,url})),options);notify(stopped.current?'작업을 중지했습니다. 완료된 캡처는 보관됩니다.':'캡처가 끝났습니다. 결과를 확인하고 문서를 내보내세요.');}
    catch(e){notify((e as Error).message);}finally{setRunning(false);}
  }
  async function loadDemo(){
    setDemoLoading(true);
    try{
      const samples=[{file:'studio',title:'North Studio — Digital experiences',url:'https://north-studio.example/'},{file:'forma',title:'Forma — A space for better work',url:'https://forma.example/'},{file:'journal',title:'Fieldnotes — Ideas worth collecting',url:'https://fieldnotes.example/'}];
      const data=await Promise.all(samples.map(async s=>{const response=await fetch(`./samples/${s.file}.jpg`);if(!response.ok)throw new Error('샘플 이미지를 불러오지 못했습니다.');const blob=await response.blob();const image=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as string);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});return {...makeItem(s.url),title:s.title,status:'done' as const,image,width:1440,height:900,capturedAt:new Date().toISOString(),httpStatus:200,note:'SnapDeck 사용 흐름을 위한 가상 브랜드의 샘플 캡처입니다.'};}));
      setItems(data);setTitle('디자인 벤치마킹 · 샘플');setProjectId(newId());setView('studio');notify('샘플 3개를 불러왔습니다. PPTX·엑셀 다운로드를 체험해 보세요.');
    }catch(e){notify((e as Error).message);}finally{setDemoLoading(false);}
  }
  async function importImages(files:FileList|null){
    if(!files)return;
    try{
      const imported:CaptureItem[]=[];
      if(items.length+files.length>300)throw new Error('최대 300개 이미지를 추가할 수 있습니다.');
      for(const file of Array.from(files)){
        if(!['image/png','image/jpeg'].includes(file.type)||file.size>10*1024*1024)throw new Error('이미지는 각 10MB 이하의 PNG·JPG 파일이어야 합니다.');
        const bitmap=await createImageBitmap(file);const scale=Math.min(1,1920/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
        imported.push({...makeItem('https://example.com/'),url:'',title:file.name.replace(/\.[^.]+$/,''),status:'done',image:canvas.toDataURL('image/jpeg',.9),width:canvas.width,height:canvas.height,capturedAt:new Date().toISOString()});
      }
      setItems(old=>[...old,...imported]);notify(`${imported.length}개 이미지를 추가했습니다.`);
    }catch(e){notify((e as Error).message);}finally{if(imageInput.current)imageInput.current.value='';}
  }
  async function exportFile(){setExporting(true);try{await exportDocument(selected,format,template,title);notify(`${format.toUpperCase()} 문서를 다운로드했습니다.`);}catch(e){notify(`내보내기 실패: ${(e as Error).message}`);}finally{setExporting(false);}}
  async function save(){try{if(!items.length){notify('URL이나 캡처를 먼저 추가해 주세요.');return;}await saveProject({id:projectId,title,date:new Date().toISOString(),items});notify('이 기기의 보관함에 저장했습니다.');}catch{notify('기기 저장 공간이 부족하거나 브라우저 저장이 차단되어 있습니다.');}}
  async function openLibrary(){setView('library');try{setProjects(await getProjects());}catch{notify('보관함을 불러오지 못했습니다.');}}
  async function openSessions(){setModal('sessions');if(window.snapdeck)try{setSessions(await window.snapdeck.sessions());}catch(e){notify((e as Error).message);}}
  async function addSession(){if(!window.snapdeck)return;setSessionBusy(true);try{const s=await window.snapdeck.addSession(sessionUrl);setSessions(old=>[...old.filter(x=>x.id!==s.id),s]);setSessionUrl('');notify('로그인 세션을 이 기기에 암호화해 저장했습니다.');}catch(e){notify((e as Error).message);}finally{setSessionBusy(false);}}
  const visibleItems=items.filter(i=>(filter==='all'||i.status===filter)&&`${i.title} ${i.url}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e=>{e.preventDefault();setView('studio');}}><span className="brand-mark"><Scan size={24}/></span>snapdeck<span className="brand-dot">®</span></a>
      <div className="workspace-switch"><span className="workspace-avatar">N</span><span>내 워크스페이스<small>Personal workspace</small></span><ChevronDown size={14}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="주 메뉴"><button className={view==='studio'?'nav-item active':'nav-item'} onClick={()=>setView('studio')}><ScanLine size={19}/>캡처 스튜디오<span className="nav-count">{items.length}</span></button><button className={view==='library'?'nav-item active':'nav-item'} onClick={openLibrary} disabled={running}><FolderOpen size={19}/>내 보관함</button><button className="nav-item" onClick={openSessions}><LockKeyhole size={19}/>로그인 세션</button></nav>
      <div className="sidebar-bottom"><div className="local-card"><span className="local-icon"><ShieldCheck size={21}/></span><strong>당신의 리서치는, 당신의 것.</strong><p>캡처와 문서 작업을<br/>내 기기 안에서 안전하게.</p><button onClick={()=>setModal('help')}>로컬 처리 알아보기 <ArrowRight size={14}/></button></div><button className="nav-item" onClick={()=>setModal('help')}><CircleHelp size={18}/>사용 가이드<ArrowRight size={14}/></button><div className="profile"><span className="profile-avatar">N</span><div>Personal workspace<small>SnapDeck · v0.1</small></div></div></div>
    </aside>
    <div className="main-shell">
      <button className="language-toggle" data-no-translate aria-label={locale==='ko'?'Switch to English':'한국어로 전환'} onClick={()=>{const next=locale==='ko'?'en':'ko';if(title==='새로운 리서치'||title==='New Research')setTitle(next==='ko'?'새로운 리서치':'New Research');setSavedLocale(next);setLocale(next);}}><Globe2 size={14}/>{locale==='ko'?'EN':'한국어'}</button>
      <header className="topbar"><div className="breadcrumb">워크스페이스 <span>/</span><strong>{view==='studio'?'캡처 스튜디오':'내 보관함'}</strong></div><div className="topbar-right"><span className="environment"><span className={isDesktop?'status-dot':'status-dot web'}/>{isDesktop?'로컬 엔진 연결됨':'웹 체험 버전'}</span><span className="github-link">PRIVATE BETA</span></div></header>
      <main>
        <section className="page-heading"><div><div className="eyebrow">CAPTURE LESS. DISCOVER MORE.</div><h1>{view==='studio'?<>웹페이지를, <span>한 장의 인사이트로.</span></>:'다시 꺼내 보는 리서치.'}</h1><p>{view==='studio'?'링크를 모으고, 깔끔하게 캡처하고, 바로 공유할 문서로 완성하세요.':'이 브라우저 또는 앱에 저장된 프로젝트입니다.'}</p></div><button className="button secondary heading-action" disabled={running} onClick={()=>{setItems([]);setTitle('새로운 리서치');setProjectId(newId());setInput('');setView('studio');}}><Plus size={17}/>새 프로젝트</button></section>
        {view==='library'?<section className="library-grid">{projects.length?projects.map(p=><article className="project-card" key={p.id}><div className="project-cover">{p.items.find(i=>i.image)?.image?<img src={p.items.find(i=>i.image)!.image} alt="프로젝트 첫 번째 캡처"/>:<FolderOpen size={42}/>}</div><div className="project-info"><h3>{p.title}</h3><p>{p.items.length}개 페이지 · {new Date(p.date).toLocaleDateString('ko-KR')}</p><div><button className="button secondary" onClick={()=>{setItems(p.items);setTitle(p.title);setProjectId(p.id);setView('studio');}}>프로젝트 열기 <ArrowRight size={15}/></button><button className="icon-button" aria-label={`${p.title} 삭제`} onClick={async()=>{await deleteProject(p.id);setProjects(old=>old.filter(x=>x.id!==p.id));}}><Trash2 size={17}/></button></div></div></article>):<div className="library-empty"><FolderOpen size={40}/><h2>첫 리서치를 보관해 보세요.</h2><p>캡처 결과에서 ‘프로젝트 저장’을 누르면 이곳에 표시됩니다.</p><button className="button primary" onClick={()=>setView('studio')}>스튜디오로 이동 <ArrowRight size={16}/></button></div>}</section>:<>
        <div className="studio-grid">
          <div className="setup-column">
            <section className="panel input-panel"><div className="panel-heading"><div><span className="step-number">01</span><h2>링크 모으기</h2></div><span className="subtle">최대 300개</span></div><div className="input-tabs"><span><Link2 size={15}/>URL 입력</span><button onClick={()=>fileInput.current?.click()}><Upload size={15}/>파일 가져오기</button></div><div className={`url-editor ${dragging?'dragging':''}`} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);void importFile(e.dataTransfer.files[0]);}}><div className="line-numbers">{Array.from({length:Math.max(4,Math.min(8,input.split('\n').length))},(_,i)=><span key={i}>{String(i+1).padStart(2,'0')}</span>)}</div><textarea aria-label="캡처할 URL 목록" value={input} onChange={e=>setInput(e.target.value)} placeholder={'https://example.com\nhttps://your-inspiration.com\n\nURL을 한 줄에 하나씩 붙여넣으세요.'} spellCheck={false} disabled={running}/>{dragging&&<div className="drop-overlay"><Upload/>파일을 여기에 놓으세요</div>}</div><div className="input-bottom"><span><CheckCheck size={14}/>{input?`${parsed.urls.length}개 유효 · ${parsed.duplicates}개 중복${parsed.invalid.length?` · ${parsed.invalid.length}개 오류`:''}`:'중복 링크는 자동으로 정리해요'}</span><button className="button small secondary" onClick={addUrls} disabled={running||!parsed.urls.length}>목록에 추가 <Plus size={14}/></button></div><div className="file-hint"><FileSpreadsheet size={15}/><span>TXT, CSV, XLSX 파일을 끌어 놓아도 좋아요.</span></div></section>
            <section className="panel settings-panel"><div className="panel-heading"><div><span className="step-number">02</span><h2>캡처 설정</h2></div><Settings2 size={17}/></div><fieldset disabled={running}><legend>디바이스</legend><div className="device-grid">{(Object.keys(devices) as Device[]).map(device=>{const Icon=deviceIcons[device];return <button key={device} className={options.device===device?'device selected':'device'} onClick={()=>setOptions({...options,device})} aria-pressed={options.device===device}><Icon size={21}/><strong>{devices[device].label}</strong><span>{devices[device].width} × {devices[device].height}</span></button>;})}</div><legend className="capture-label">캡처 영역</legend><div className="segmented"><button className={options.mode==='viewport'?'selected':''} onClick={()=>setOptions({...options,mode:'viewport'})}><Monitor size={15}/>첫 화면</button><button className={options.mode==='fullpage'?'selected':''} onClick={()=>setOptions({...options,mode:'fullpage'})}><ArrowDownToLine size={15}/>전체 페이지</button><button className={options.mode==='selector'?'selected':''} onClick={()=>setOptions({...options,mode:'selector'})}><Scan size={15}/>특정 영역</button></div>{options.mode==='selector'&&<input className="text-input selector-input" aria-label="CSS 선택자" placeholder="CSS 선택자 (예: main, .hero)" value={options.selector} onChange={e=>setOptions({...options,selector:e.target.value})}/>}<div className="clean-setting"><span className="sparkle-icon"><WandSparkles size={21}/></span><div><strong>클린 캡처 <span className="mini-badge">SMART</span></strong><p>쿠키 배너와 채팅 위젯을 숨겨 깔끔하게</p></div><button className={`switch ${options.clean?'on':''}`} role="switch" aria-checked={options.clean} aria-label="클린 캡처" onClick={()=>setOptions({...options,clean:!options.clean})}><span/></button></div>{sessions.length>0&&<label className="session-select">로그인 세션<select value={options.sessionId||''} onChange={e=>setOptions({...options,sessionId:e.target.value||undefined})}><option value="">사용하지 않음</option>{sessions.map(s=><option key={s.id} value={s.id}>{s.origin}</option>)}</select></label>}</fieldset><button className={`button capture-button ${running?'stop':''}`} onClick={running?async()=>{stopped.current=true;await window.snapdeck?.cancel();}:startCapture} disabled={demoLoading}>{running?<><Square size={16}/>캡처 중지<span>{done.length+failures.length} / {items.length}</span></>:<><ScanLine size={20}/>캡처 시작하기<ArrowRight size={19}/></>}</button><div className="capture-footnote"><ShieldCheck size={13}/>{isDesktop?'내 기기에서 캡처 · 서버 업로드 없음':'실제 URL 캡처는 데스크톱 앱에서 실행됩니다.'}</div></section>
          </div>
          <section className="panel output-panel"><div className="panel-heading"><div><span className="step-number">03</span><h2>문서 완성하기</h2></div><span className="live-label">EXPORT STUDIO</span></div><label className="field-label" htmlFor="project-title">프로젝트 이름</label><input id="project-title" className="text-input project-title" value={title} onChange={e=>setTitle(e.target.value)} maxLength={80}/><div className="field-label format-label">내보내기 형식</div><div className="format-options"><button className={format==='pptx'?'format-card selected':'format-card'} onClick={()=>setFormat('pptx')}><span className="file-icon ppt">P</span><span><strong>PowerPoint</strong><small>.pptx 프레젠테이션</small></span><span className="radio">{format==='pptx'&&<span/>}</span></button><button className={format==='xlsx'?'format-card selected':'format-card'} onClick={()=>setFormat('xlsx')}><span className="file-icon xls">X</span><span><strong>Excel</strong><small>.xlsx 스프레드시트</small></span><span className="radio">{format==='xlsx'&&<span/>}</span></button></div><div className="field-label template-label">{format==='pptx'?'슬라이드 레이아웃':'시트 레이아웃'}<span>{format==='pptx'?'16:9 와이드스크린':'썸네일 + 메타데이터'}</span></div>{format==='pptx'?<div className="template-options">{(['detail','compare2','compare4'] as Template[]).map((t,index)=><button key={t} onClick={()=>setTemplate(t)} className={template===t?'template selected':'template'}><span className={`template-illustration ${t}`}>{Array.from({length:index===0?1:index===1?2:4},(_,i)=><span key={i}><Image size={14}/></span>)}{index===0&&<i><b/><b/><b/></i>}</span><span>{['상세 분석','2개 비교','4개 비교'][index]}{template===t&&<Check size={13}/>}</span></button>)}</div>:<div className="sheet-preview"><div>미리보기</div><div>사이트명</div><div>URL · 메모</div>{[1,2,3].map(n=><div className="sheet-row" key={n}><span><Image size={16}/></span><span>페이지 {n}</span><span>https://…</span></div>)}</div>}<div className="export-note"><span className="export-note-icon"><Sparkles size={17}/></span><p>{format==='pptx'?'이미지 비율, 제목, 링크까지. 바로 공유할 수 있는 슬라이드로 정리해요.':'스크린샷과 사이트 정보를 행마다 정리해요. URL은 클릭 가능한 링크로 저장돼요.'}</p></div><div className="export-summary"><span>선택한 캡처</span><strong>{selected.length}<span>{locale==='ko'?'개':'items'}</span></strong></div><button className="button export-button" disabled={!selected.length||exporting||running} onClick={exportFile}>{exporting?<LoaderCircle size={18} className="spin"/>:<ArrowDownToLine size={18}/>} {exporting?'문서를 만들고 있어요':`${format.toUpperCase()} 다운로드`}<span>{format==='pptx'?Math.ceil(selected.length/(template==='detail'?1:template==='compare2'?2:4))+' slides':selected.length+' rows'}</span></button></section>
        </div>
        <section className="results-section"><div className="results-heading"><div><h2>캡처 보드 <span>{items.length}</span></h2><p>{running?'페이지를 하나씩 정리하고 있어요.':items.length?'캡처를 선택하고 메모를 더해 나만의 리서치를 완성하세요.':'영감이 될 페이지들을 이곳에 모아 보세요.'}</p></div><div className="result-actions"><button className="button secondary small" onClick={()=>imageInput.current?.click()} disabled={running}><FileImage size={15}/>이미지 추가</button><button className="button secondary small" onClick={save} disabled={!items.length||running}><FolderOpen size={15}/>프로젝트 저장</button><div className="view-toggle"><button aria-label="그리드 보기" className={layout==='grid'?'selected':''} onClick={()=>setLayout('grid')}><Grid2X2 size={16}/></button><button aria-label="목록 보기" className={layout==='list'?'selected':''} onClick={()=>setLayout('list')}><List size={17}/></button></div></div></div>{running&&<div className="progress-track"><div style={{width:`${(done.length+failures.length)/items.length*100}%`}}/></div>}
          {items.length>0?<><div className="board-toolbar"><div className="filter-tabs"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>전체 {items.length}</button><button className={filter==='done'?'active':''} onClick={()=>setFilter('done')}>완료 {done.length}</button><button className={filter==='error'?'active':''} onClick={()=>setFilter('error')}>실패 {failures.length}</button></div><div className="board-search"><Search size={14}/><input aria-label="캡처 검색" placeholder="사이트 검색" value={search} onChange={e=>setSearch(e.target.value)}/></div><button className="text-button" onClick={()=>setItems(old=>old.map(i=>({...i,selected:selected.length!==done.length})))}>전체 {selected.length===done.length?'해제':'선택'}</button></div><div className={`capture-grid ${layout==='list'?'list-view':''}`}>{visibleItems.map((item,index)=><article key={item.id} className={`capture-card ${item.status==='error'?'failed':''}`}><div className="capture-thumbnail"><button className="thumbnail-open" aria-label={`${item.title} 미리보기`} onClick={()=>item.image&&setPreview(item.id)}>{item.image?<img src={item.image} alt={item.title}/>:<div className="capture-placeholder">{item.status==='capturing'?<LoaderCircle className="spin" size={27}/>:item.status==='error'?<CircleHelp size={26}/>:<Globe2 size={28}/>}<span>{item.status==='capturing'?'페이지를 캡처하고 있어요':item.status==='error'?'캡처를 완료하지 못했어요':'캡처 대기 중'}</span>{item.error&&<small>{item.error}</small>}</div>}</button><label className="capture-checkbox"><input type="checkbox" aria-label={`${item.title} 선택`} checked={item.selected} onChange={e=>setItems(old=>old.map(i=>i.id===item.id?{...i,selected:e.target.checked}:i))}/><span><Check size={12}/></span></label><span className={`capture-status ${item.status}`}>{item.status==='done'?<><Check size={11}/>완료</>:item.status==='error'?'실패':item.status==='capturing'?'캡처 중':'대기'}</span></div><div className="capture-info"><div><span className="capture-index">{String(index+1).padStart(2,'0')}</span><h3>{item.title}</h3><button className="icon-button" disabled={running} aria-label={`${item.title} 삭제`} onClick={()=>setItems(old=>old.filter(i=>i.id!==item.id))}><Trash2 size={14}/></button></div><p>{item.url||'내 기기에서 가져온 이미지'}</p><input aria-label={`${item.title} 메모`} placeholder="인사이트를 메모해 보세요…" value={item.note} onChange={e=>setItems(old=>old.map(i=>i.id===item.id?{...i,note:e.target.value}:i))}/></div></article>)}</div>{!visibleItems.length&&<div className="no-results">검색 조건에 맞는 캡처가 없습니다.</div>}</>:<div className="empty-board"><div className="empty-icon"><ScanLine size={31}/><span><Plus size={12}/></span></div><h3>좋은 리서치는, 링크 하나에서.</h3><p>위에 URL을 입력하거나 샘플 프로젝트로 먼저 둘러보세요.</p><button className="button secondary" disabled={demoLoading} onClick={loadDemo}>{demoLoading?<LoaderCircle size={15} className="spin"/>:<Sparkles size={15}/>}샘플 프로젝트 열어보기<ArrowRight size={15}/></button><span className="empty-footnote">가입 없이 · 샘플 캡처 3개 · 문서 내보내기 체험</span></div>}
        </section><footer><span><Scan size={14}/>snapdeck</span><p>Less busywork. More perspective.</p><button onClick={()=>setModal('help')}>도움이 필요하신가요? <CircleHelp size={14}/></button></footer>
        </>}
      </main>
    </div>
    <input ref={fileInput} type="file" accept=".txt,.csv,.xlsx" hidden onChange={e=>{void importFile(e.target.files?.[0]);e.target.value='';}}/><input ref={imageInput} type="file" accept="image/png,image/jpeg" multiple hidden onChange={e=>void importImages(e.target.files)}/>
    {notice&&<div className="toast" role="status"><Check size={17}/><span>{notice}</span><button aria-label="알림 닫기" onClick={()=>setNotice('')}><X size={15}/></button></div>}
    {(modal||currentPreview)&&<div className="modal-overlay" onClick={()=>{setModal(null);setPreview(null);}}><section className={`modal ${currentPreview?'image-modal':''}`} role="dialog" aria-modal="true" aria-label={currentPreview?.title||'SnapDeck 안내'} onClick={e=>e.stopPropagation()}><button className="modal-close icon-button" autoFocus aria-label="닫기" onClick={()=>{setModal(null);setPreview(null);}}><X size={22}/></button>{currentPreview?<><h2>{currentPreview.title}</h2><p>{currentPreview.url}</p><img src={currentPreview.image} alt={currentPreview.title}/><div className="preview-meta"><span>{currentPreview.width} × {currentPreview.height} · {currentPreview.capturedAt&&new Date(currentPreview.capturedAt).toLocaleString('ko-KR')}</span><button className="button secondary" onClick={async()=>{const blob=await (await fetch(currentPreview.image!)).blob();downloadBlob(blob,`${currentPreview.title.replace(/[^\w가-힣-]/g,'_')}.jpg`);}}><ArrowDownToLine size={16}/>이미지 저장</button></div></>:modal==='desktop'?<><span className="modal-symbol"><Monitor size={29}/></span><h2>실제 웹 캡처는 내 기기에서.</h2><p>SnapDeck 데스크톱 앱이 웹페이지에 접속하고 캡처합니다. 로그인 세션과 캡처 이미지는 외부 서버에 업로드되지 않습니다.</p><div className="info-box">지금 웹에서는 샘플 프로젝트 또는 직접 가져온 PNG·JPG 이미지로 PPTX·엑셀 만들기를 사용할 수 있어요.</div><a className="button primary" href="https://github.com/Noah0615/webcapture#데스크톱-실행" target="_blank" rel="noreferrer">데스크톱 실행 안내 <ArrowRight size={16}/></a><button className="button secondary" onClick={()=>{setModal(null);void loadDemo();}}>샘플로 체험하기 <Sparkles size={16}/></button></>:modal==='sessions'?<><span className="modal-symbol"><LockKeyhole size={27}/></span><h2>로그인 세션</h2><p>앱에서 한 번 로그인한 뒤, 같은 사이트의 페이지를 이어서 캡처하세요.</p>{isDesktop?<><div className="session-add"><input className="text-input" aria-label="로그인할 사이트 URL" placeholder="https://your-workspace.com" value={sessionUrl} onChange={e=>setSessionUrl(e.target.value)}/><button className="button primary" disabled={sessionBusy||!sessionUrl} onClick={addSession}>{sessionBusy?<LoaderCircle className="spin" size={16}/>:'로그인 창 열기'}</button></div><p className="subtle">로그인을 마친 후 열린 브라우저 창을 닫으면 저장됩니다.</p>{sessions.map(s=><div className="session-row" key={s.id}><Globe2 size={17}/><span>{s.origin}</span><button className="icon-button" aria-label={`${s.origin} 세션 삭제`} onClick={async()=>{await window.snapdeck!.removeSession(s.id);setSessions(old=>old.filter(x=>x.id!==s.id));if(options.sessionId===s.id)setOptions({...options,sessionId:undefined});}}><Trash2 size={16}/></button></div>)}</>:<div className="info-box">로그인 세션은 데스크톱 앱에서 사용할 수 있습니다. 비밀번호를 SnapDeck 웹사이트에 입력하지 마세요.</div>}</>:<><span className="modal-symbol"><CircleHelp size={28}/></span><h2>링크에서 보고서까지, 세 단계.</h2><ol className="guide-list"><li><strong>링크 모으기</strong><p>URL을 붙여넣거나 TXT·CSV·XLSX 파일의 첫 번째 열을 불러옵니다. 중복은 자동 제거됩니다.</p></li><li><strong>캡처 설정</strong><p>디바이스와 캡처 범위를 선택합니다. 데스크톱 앱은 로컬 Chromium에서 캡처하며, 웹에서는 이미지 가져오기와 샘플 체험을 지원합니다.</p></li><li><strong>문서 완성하기</strong><p>완료된 캡처를 선택하고 메모를 작성하세요. PPTX 또는 XLSX를 고르면 브라우저 안에서 문서를 만듭니다.</p></li></ol><div className="info-box">보관함은 이 기기에만 저장됩니다. 브라우저 데이터를 삭제하면 보관함도 삭제됩니다. 클린 캡처는 알려진 배너를 숨기며, CAPTCHA나 유료 콘텐츠의 접근 제한을 우회하지 않습니다.</div></>}</section></div>}
  </div>;
}
