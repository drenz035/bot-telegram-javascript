// keyboards.js
// ─────────────────────────────────────────────
//  Inline keyboard definitions
// ─────────────────────────────────────────────

const { Markup } = require('telegraf');

/** Main menu shown after /start */
const mainMenu = Markup.inlineKeyboard([
  [
    Markup.button.callback('📋 Minhas Tarefas', 'list_tasks'),
    Markup.button.callback('🌤️ Clima', 'prompt_clima'),
  ],
  [
    Markup.button.callback('📡 Ping', 'cmd_ping'),
    Markup.button.callback('❓ Ajuda', 'cmd_ajuda'),
  ],
]);

/** Back to menu button */
const backToMenu = Markup.inlineKeyboard([
  [Markup.button.callback('🏠 Voltar ao Menu', 'main_menu')],
]);

module.exports = { mainMenu, backToMenu };
