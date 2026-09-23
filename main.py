import asyncio
import logging

from maxapi import Bot, Dispatcher, F
from maxapi.filters.command import CommandStart
from maxapi.types import BotStarted, MessageCreated

from config import max_token

logging.basicConfig(level=logging.INFO)

bot = Bot(max_token)
dp = Dispatcher()

@dp.bot_started()
async def bot_started(event: BotStarted):
    await event.bot.send_message(
        chat_id=event.chat_id,
        text='Привет! Отправь мне /start'
    )

@dp.message_created(CommandStart())
async def hello(event: MessageCreated):
    await event.message.answer('Пример чат-бота для MAX 💙')

@dp.message_created(F.message.body.text)
async def echo(event: MessageCreated):
    await event.message.answer(event.message.body.text)


async def main():
    await bot.delete_webhook()
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())