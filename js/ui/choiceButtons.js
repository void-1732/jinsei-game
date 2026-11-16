/** Accessible single-choice button group for a small, fixed set of options.
 * Selects a value without triggering the game's action until the caller confirms.
 */
export function choiceButtons(label,options,initial,onChange=()=>{}){
  const wrapper=document.createElement('div');
  wrapper.className='choice-button-field';
  const title=document.createElement('span');
  title.className='choice-button-label';
  title.textContent=label;
  const group=document.createElement('div');
  group.className='choice-button-group';
  group.setAttribute('role','group');
  group.setAttribute('aria-label',label);
  const normalize=options.map(option=>typeof option==='string'?{value:option,label:option}:option);
  let value=normalize.some(option=>option.value===initial)?initial:normalize[0]?.value;
  const buttons=new Map();
  const update=()=>{
    for(const [key,button]of buttons){
      const selected=key===value;
      button.setAttribute('aria-pressed',String(selected));
      button.classList.toggle('is-selected',selected);
    }
  };
  for(const option of normalize){
    const button=document.createElement('button');
    button.type='button';
    button.className='choice-button';
    button.textContent=option.label;
    button.dataset.value=String(option.value);
    button.addEventListener('click',()=>{
      if(value===option.value)return;
      value=option.value;
      update();
      onChange(value);
    });
    group.append(button);
    buttons.set(option.value,button);
  }
  update();
  wrapper.append(title,group);
  return {element:wrapper,group,getValue:()=>value,setValue:next=>{if(buttons.has(next)){value=next;update();}},buttons};
}
