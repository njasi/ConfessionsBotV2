


function send_menu(menu, from, bot){
  const {message, options} = menu.load()
}

async function detectAndSwapMenu(query) {
  if (query.data.match(/^menu/)) {
    const params = params_from_string(query.data);
    await swapMenu(query, params);
    return true;
  }
  return false;
}

class Menu{
  constructor(get_data,key){
    this.key = key
  }
  async load(args){
    return await this.get_data(...args)
  }
}

menu_dict = {
  "start" : start,
  "help" :null,
  "cw1":null,
  "cw2":null,
  "cw3":null,
  "cw4":null,
  "send":null,
  "cancel":null,
  "done":null,
}

const start = new Menu(
  (from)=>{
    const message = ""
  }
)