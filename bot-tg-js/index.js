// index.js
// ═══════════════════════════════════════════════════════
//  Telegram Bot Portfolio — by [Your Name]
//  Stack: Node.js · Telegraf · Axios · OpenWeatherMap
//  GitHub: https://github.com/yourusername/telegram-bot-portfolio
// ═══════════════════════════════════════════════════════

'use strict';
require('dotenv').config();

const { Telegraf, Markup } = require('telegraf');
const logger               = require('./logger');
const { getWeather }       = require('./weather');
const { mainMenu, backToMenu } = require('./keyboards');
const {
  getTasks,
  addTask,
  removeTask,
  toggleTask,
  totalTaskCount,
  uniqueUserCount,
} = require('./taskStore');

// ── Validation ───────────────────────────────
if (!process.env.BOT_TOKEN) {
  logger.error('BOT_TOKEN is missing! Copy .env.example → .env and add your token.');
  process.exit(1);
}

const bot       = new Telegraf(process.env.BOT_TOKEN);
const startTime = Date.now();
const ADMIN_ID  = Number(process.env.ADMIN_USER_ID) || 0;

// ── Middleware: Log every update ─────────────
bot.use(async (ctx, next) => {
  try {
    const user = ctx.from?.username ?? ctx.from?.first_name ?? 'unknown';
    const type = ctx.updateType;
    logger.event(type, user);
    return next();
  } catch (err) {
    logger.error(`Middleware error: ${err.message}`);
    return next();
  }
});

// ── /start ───────────────────────────────────
bot.start(async (ctx) => {
  try {
    const name = ctx.from?.first_name ?? 'amigo(a)';

    const welcome = [
      `👋 *Olá, ${escapeMarkdown(name)}!*`,
      '',
      'Sou um bot de portfólio feito com *Node.js + Telegraf*.',
      'Posso te ajudar com tarefas, clima e muito mais! 🚀',
      '',
      '👇 Use o menu abaixo ou os comandos de texto:',
    ].join('\n');

    await ctx.replyWithMarkdownV2(escapeMarkdownAll(welcome), mainMenu);
  } catch (err) {
    logger.error(`Start command error: ${err.message}`);
    await ctx.reply('⚠️ Erro ao enviar mensagem.').catch(() => {});
  }
});

// ── /ajuda ───────────────────────────────────
bot.help(sendAjuda);
bot.command('ajuda', sendAjuda);

async function sendAjuda(ctx) {
  try {
    const text = [
      '📖 *Comandos disponíveis*',
      '',
      '`/start` — Boas\\-vindas e menu principal',
      '`/ping` — Testa latência e uptime',
      '`/clima <cidade>` — Clima atual de qualquer cidade',
      '',
      '*📋 Gerenciador de Tarefas*',
      '`/tarefa add <texto>` — Adiciona uma tarefa',
      '`/tarefas` — Lista todas as suas tarefas',
      '`/tarefa rm <id>` — Remove a tarefa pelo ID',
      '`/tarefa done <id>` — Marca/desmarca como concluída',
      '',
      '`/ajuda` — Mostra este menu',
    ].join('\n');

    await ctx.replyWithMarkdownV2(text, backToMenu);
  } catch (err) {
    logger.error(`sendAjuda error: ${err.message}`);
    await ctx.reply('⚠️ Erro ao exibir ajuda.').catch(() => {});
  }
}

// ── /ping ────────────────────────────────────
bot.command('ping', async (ctx) => {
  try {
    const sent  = Date.now();
    const msg   = await ctx.reply('🏓 Calculando...');
    const delta = Date.now() - sent;
    const upMs  = Date.now() - startTime;

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      msg.message_id,
      undefined,
      formatPing(delta, upMs),
      { parse_mode: 'MarkdownV2', ...backToMenu }
    );
  } catch (err) {
    logger.error(`Ping command error: ${err.message}`);
    await ctx.reply('⚠️ Erro ao calcular ping.').catch(() => {});
  }
});

function formatPing(latencyMs, uptimeMs) {
  const { h, m, s } = msToHMS(uptimeMs);
  return [
    '🏓 *Pong\\!*',
    '',
    `⚡ Latência: \`${latencyMs}ms\``,
    `⏱️ Uptime:   \`${h}h ${m}m ${s}s\``,
  ].join('\n');
}

// ── /clima ───────────────────────────────────
bot.command('clima', async (ctx) => {
  try {
    const args = ctx.message?.text?.split(' ').slice(1) ?? [];
    const city = args.join(' ').trim();

    if (!city) {
      return ctx.replyWithMarkdownV2(
        '🌍 Por favor, informe uma cidade\\!\nExemplo: `/clima São Paulo`',
        backToMenu
      );
    }

    const loading = await ctx.reply(`🔍 Buscando clima para *${city}*…`, { parse_mode: 'Markdown' });

    try {
      const w = await getWeather(city);

      const text = [
        `${w.emoji} *${escapeMarkdown(w.city)}, ${w.country}*`,
        `_${escapeMarkdown(w.description)}_`,
        '',
        `🌡️ Temperatura:  \`${w.temp}°C\` \\(sensação ${w.feelsLike}°C\\)`,
        `🔺 Máx / Mín:    \`${w.tempMax}°C / ${w.tempMin}°C\``,
        `💧 Umidade:      \`${w.humidity}%\``,
        `💨 Vento:        \`${w.windSpeed} m/s\``,
        `☁️ Nebulosidade: \`${w.cloudiness}%\``,
        w.visibility ? `👁️ Visibilidade: \`${w.visibility} km\`` : '',
      ].filter(Boolean).join('\n');

      await ctx.telegram.editMessageText(
        ctx.chat.id, loading.message_id, undefined,
        text,
        { parse_mode: 'MarkdownV2', ...backToMenu }
      );
    } catch (err) {
      logger.error(`Weather error: ${err.message}`);
      const isNotFound = err.response?.status === 404;

      await ctx.telegram.editMessageText(
        ctx.chat.id, loading.message_id, undefined,
        isNotFound
          ? `❌ Cidade *"${escapeMarkdown(city)}"* não encontrada\\. Verifique o nome e tente novamente\\.`
          : `⚠️ Erro ao buscar o clima\\. Tente novamente mais tarde\\.`,
        { parse_mode: 'MarkdownV2', ...backToMenu }
      );
    }
  } catch (err) {
    logger.error(`Clima command error: ${err.message}`);
    await ctx.reply('⚠️ Erro inesperado. Tente novamente mais tarde.').catch(() => {});
  }
});

// ── TAREFAS ──────────────────────────────────

// /tarefas — list all
bot.command('tarefas', async (ctx) => {
  try {
    await handleListTasks(ctx);
  } catch (err) {
    logger.error(`Tarefas command error: ${err.message}`);
    await ctx.reply('⚠️ Erro ao listar tarefas.').catch(() => {});
  }
});

// ── /tarefa <subcommand>
bot.command('tarefa', async (ctx) => {
  try {
    const parts = ctx.message?.text?.split(' ').slice(1) ?? [];
    const sub   = parts[0]?.toLowerCase();

    switch (sub) {
      case 'add':
      case 'adicionar': {
        const text = parts.slice(1).join(' ').trim();
        if (!text) {
          return ctx.replyWithMarkdownV2(
            '📝 Informe o texto da tarefa\\!\nExemplo: `/tarefa add Comprar leite`'
          );
        }
        const task = addTask(ctx.from.id, text);
        await ctx.replyWithMarkdownV2(
          `✅ Tarefa *\\#${task.id}* adicionada\\!\n\`${escapeMarkdown(task.text)}\``,
          backToMenu
        );
        break;
      }

      case 'rm':
      case 'remover':
      case 'del':
      case 'delete': {
        const id = Number(parts[1]);
        if (!id) {
          return ctx.replyWithMarkdownV2('❌ Informe o ID\\! Exemplo: `/tarefa rm 1`');
        }
        const removed = removeTask(ctx.from.id, id);
        await ctx.reply(removed ? `🗑️ Tarefa #${id} removida.` : `⚠️ Tarefa #${id} não encontrada.`);
        break;
      }

      case 'done':
      case 'feito':
      case 'toggle': {
        const id   = Number(parts[1]);
        if (!id) {
          return ctx.replyWithMarkdownV2('❌ Informe o ID\\! Exemplo: `/tarefa done 1`');
        }
        const task = toggleTask(ctx.from.id, id);
        if (!task) return ctx.reply(`⚠️ Tarefa #${id} não encontrada.`);
        const status = task.done ? '✅ Concluída' : '🔄 Pendente';
        await ctx.replyWithMarkdownV2(
          `${status}: \`${escapeMarkdown(task.text)}\``,
          backToMenu
        );
        break;
      }

      case 'list':
      case 'listar':
        await handleListTasks(ctx);
        break;

      default:
        await ctx.replyWithMarkdownV2(
          '❓ Subcomando inválido\\. Use: `add`, `rm`, `done`, `list`\nDigite /ajuda para mais informações\\.'
        );
    }
  } catch (err) {
    logger.error(`Tarefa command error: ${err.message}`);
    await ctx.reply('⚠️ Erro ao processar comando de tarefa.').catch(() => {});
  }
});

async function handleListTasks(ctx) {
  try {
    const tasks = getTasks(ctx.from?.id);

    if (!tasks || tasks.length === 0) {
      return ctx.replyWithMarkdownV2(
        '📋 Você não tem tarefas\\! Adicione uma com `/tarefa add <texto>`',
        backToMenu
      );
    }

    const lines = tasks.map((t) => {
      const check = t.done ? '✅' : '⬜';
      const text  = escapeMarkdown(t.text);
      const strike = t.done ? `~${text}~` : text;
      return `${check} \`#${t.id}\` ${strike}`;
    });

    const pendentes  = tasks.filter((t) => !t.done).length;
    const concluidas = tasks.length - pendentes;

    const header = `📋 *Suas Tarefas* \\(${pendentes} pendente${pendentes !== 1 ? 's' : ''} · ${concluidas} concluída${concluidas !== 1 ? 's' : ''}\\)`;

    await ctx.replyWithMarkdownV2(
      [header, '', ...lines].join('\n'),
      backToMenu
    );
  } catch (err) {
    logger.error(`handleListTasks error: ${err.message}`);
    await ctx.reply('⚠️ Erro ao listar tarefas.').catch(() => {});
  }
}

// ── /admin stats ─────────────────────────────
bot.command('admin', async (ctx) => {
  try {
    if (ctx.from?.id !== ADMIN_ID) {
      return ctx.reply('🚫 Acesso negado. Esse comando é exclusivo para admins.');
    }

    const upMs = Date.now() - startTime;
    const { h, m, s } = msToHMS(upMs);

    const text = [
      '🛠️ *Painel Admin*',
      '',
      `👤 Usuários com tarefas: \`${uniqueUserCount()}\``,
      `📋 Total de tarefas:      \`${totalTaskCount()}\``,
      `⏱️ Uptime:                \`${h}h ${m}m ${s}s\``,
      `🤖 Versão Node:           \`${process.version}\``,
      `💾 Memória RSS:           \`${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB\``,
    ].join('\n');

    await ctx.replyWithMarkdownV2(text);
  } catch (err) {
    logger.error(`Admin command error: ${err.message}`);
    await ctx.reply('⚠️ Erro ao exibir painel admin.').catch(() => {});
  }
});

// ── Inline Keyboard callbacks ─────────────────
bot.action('list_tasks', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await handleListTasks(ctx);
  } catch (err) {
    logger.error(`list_tasks action error: ${err.message}`);
    await ctx.answerCbQuery('⚠️ Erro ao listar tarefas.').catch(() => {});
  }
});

bot.action('cmd_ping', async (ctx) => {
  try {
    await ctx.answerCbQuery('🏓 Calculando...');
    const latency = Date.now() % 100 + 20; // simulated
    const upMs    = Date.now() - startTime;
    await ctx.replyWithMarkdownV2(formatPing(latency, upMs), backToMenu);
  } catch (err) {
    logger.error(`cmd_ping action error: ${err.message}`);
    await ctx.answerCbQuery('⚠️ Erro ao calcular ping.').catch(() => {});
  }
});

bot.action('cmd_ajuda', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await sendAjuda(ctx);
  } catch (err) {
    logger.error(`cmd_ajuda action error: ${err.message}`);
    await ctx.answerCbQuery('⚠️ Erro ao exibir ajuda.').catch(() => {});
  }
});

bot.action('prompt_clima', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.replyWithMarkdownV2(
      '🌍 Qual cidade você quer consultar\\?\nDigite: `/clima São Paulo`'
    );
  } catch (err) {
    logger.error(`prompt_clima action error: ${err.message}`);
    await ctx.answerCbQuery('⚠️ Erro ao processar ação.').catch(() => {});
  }
});

bot.action('main_menu', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const name    = ctx.from?.first_name ?? 'amigo(a)';
    const welcome = `🏠 *Menu Principal*\n\nOlá, ${escapeMarkdown(name)}\\! O que você quer fazer?`;
    await ctx.replyWithMarkdownV2(welcome, mainMenu);
  } catch (err) {
    logger.error(`main_menu action error: ${err.message}`);
    await ctx.answerCbQuery('⚠️ Erro ao voltar ao menu.').catch(() => {});
  }
});

// ── Error handling ────────────────────────────
bot.catch((err, ctx) => {
  logger.error(`Update ${ctx.updateType} error: ${err.message}`);
  ctx.reply('⚠️ Ocorreu um erro inesperado. Tente novamente em instantes.')
    .catch(() => {}); // swallow secondary errors
});

// ── Graceful shutdown ─────────────────────────
process.once('SIGINT',  () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

function shutdown(signal) {
  logger.warn(`Received ${signal}. Shutting down gracefully...`);
  bot.stop(signal);
  process.exit(0);
}

// ── Launch ────────────────────────────────────
(async () => {
  try {
    const me = await bot.telegram.getMe();
    logger.success(`Bot @${me.username} is online!`);
    logger.info(`Admin User ID: ${ADMIN_ID || '⚠️  Not set (ADMIN_USER_ID in .env)'}`);
    logger.info('Press Ctrl+C to stop.\n');

    await bot.launch();
  } catch (err) {
    logger.error(`Failed to start: ${err.message}`);
    process.exit(1);
  }
})();

// ── Utilities ────────────────────────────────

/** Convert ms to hours/minutes/seconds */
function msToHMS(ms) {
  const totalSecs = Math.floor(ms / 1000);
  return {
    h: Math.floor(totalSecs / 3600),
    m: Math.floor((totalSecs % 3600) / 60),
    s: totalSecs % 60,
  };
}

/** Escape special MarkdownV2 chars for user-supplied text */
function escapeMarkdown(text = '') {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/** Escape a full message string (allows intentional formatting) */
function escapeMarkdownAll(text = '') {
  return text.replace(/[_[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}
