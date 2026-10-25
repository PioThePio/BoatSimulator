// Reserve the actual gap between sonar/atlas tools and zoom buttons, including
// after sonar loses power or the viewport changes. No per-frame layout reads.
export function installMapAlerts(){
 const wrap=document.querySelector('.water-wrap');
 const update=()=>{const bounds=wrap.getBoundingClientRect();let left=14;
  const sonar=wrap.querySelector('.sonar').getBoundingClientRect();if(sonar.width&&sonar.height)left=Math.max(left,sonar.right-bounds.left+10);
  const atlas=wrap.querySelector('#atlas-tools')?.getBoundingClientRect();wrap.style.setProperty('--alert-bottom',atlas?.height?atlas.height+20+'px':bounds.width<650?'10px':'12px');
  const right=wrap.querySelector('.map-controls').getBoundingClientRect();wrap.style.setProperty('--alert-left',left+'px');wrap.style.setProperty('--alert-right',Math.max(14,bounds.right-right.left+10)+'px');
 };
 const observer=new ResizeObserver(update);for(const el of [wrap,...wrap.querySelectorAll('.sonar,.map-controls,#atlas-tools')])observer.observe(el);update();
}
