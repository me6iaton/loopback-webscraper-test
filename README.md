# loopback-webscraper-test

Проект нужно запускать из корневой деректории командой node .

При запуске в webstorm 10 командой server/server.js, может понадобится перенести файл с базой данных из ./data.json в server/data.json. В webstorm 11 EAP это мне не понадобилось.  

Проект основан на фреймворке [LoopBack](http://loopback.io).

Это позволяет подключать различные базы данных и предоставляет доступ к данным с помощью универсального rest api.

Сейчас вместо базы данных используется [Memory connector](http://docs.strongloop.com/display/public/LB/Memory+connector),
который позвалет сохранять данные в [файле](./data.json) между запусками приложения.

## LoopBack Api

[Документация](http://docs.strongloop.com/display/public/LB/LoopBack)  
[API](http://apidocs.strongloop.com/loopback/)  
[Структура фреймворка](http://docs.strongloop.com/display/public/LB/Project+layout+reference)


## REST api
#### [http://0.0.0.0:3000/explorer](http://0.0.0.0:3000/explorer)

Через rest api можно создавать, запрашивать, обновлять и удалять данные приложения.

Доступны как статичексие методы работы с моделью, например:
- GET /Connectors - запросить и отфильтровать коннекторы
- POST /Connectors - создать новые коннекторы  

Так и методы экземпляра модели, например
- PUT /Connectors/{id} - обновить свойства коннектора  
- POST /Connectors/{id}/scrap - запустить сканирование, создать новые записи и вывести результат.  
- POST /Connectors/{id}/scrap - запустить сканирование, создать новые записи или обновить уже созданные и вывести результат.

Все операции доступны в [http://0.0.0.0:3000/explorer](http://0.0.0.0:3000/explorer)
Get запросы поддерживают фильтрацию, сортировку и лимиты, [документация](http://docs.strongloop.com/display/public/LB/Where+filter)
Все методы можно вызвать 3 способами:

в api explore в формате json
```json
{"where":{"connector":"1"}}
```

через rest api  
[http://0.0.0.0:3000/api/Records?filter[where][connector]=1](http://0.0.0.0:3000/api/Records?filter[where][connector]=1)

и js api
```javascript
Record.find({"where":{"connector":"1"}},function(err, records){
  console.console.log(connector.url);  
});
```


## Логика приложения
Модели [Connector](./common/models/connector.json) и [Record](./common/models/record.json)  
Планировщик запросов [scheduler.js](./server/boot/scheduler.js)  
Хуки для записи результатов сканирования в базу данных [./server/boot/hooks.js](./server/boot/hooks.js)

## Connector
Задает начальный url для парсинга, стратегию  перебора страниц и расписание.
[В базе есть два примера](http://0.0.0.0:3000/explorer/#!/Connectors/find) для
[bitcoinwarrior.net](bitcoinwarrior.net/category/google-bitcoin-news/) и [www.reddit.com/r/node/](ttps://www.reddit.com/r/node/)

```json
{
  "url": "",
  "domain": "",
  "chainScraping": [
    "object"
  ],
  "schedule": "",
  "active": false,
  "id": 0
}
```
#### Properties
**chainScraping** - параметры в json формате для парсера страниц, транслируются в вызовы функций [node-osmosis](https://github.com/rc0x03/node-osmosis) поддержка csc, xpath селекторов и рекурсивного перехода по ссылкам
из контента основной страницы например, для парсинга полного текста новости.  
Есть удобное [расширение](http://selectorgadget.com/) для поиска нужных селекторов.  

Пример для [bitcoinwarrior.net](bitcoinwarrior.net/category/google-bitcoin-news/)
```json
"chainScraping": [
      {

        "find": ".item-details"
      },
      {
        "set": {
          "title": "h3 a",
          "description": ".td-post-text-excerpt",
          "url": "h3 a@href"
        }
      },
      {
        "follow": "h3 a@href"
      },
      {
        "set": {
          "content": ".td-post-text-content:html",
          "published": "/html/head/meta[@property='article:published_time']/@content",
          "share": {
            "twitter": ".share-twitter .share-count"
          }

        }
      }
    ]
```
**schedule** - расписание запросов для этого коннектора, в cron формате, модуль [node-cron](https://github.com/ncb000gt/node-cron)  

**active** - boolean, запускать парсер по расписанию.

#### REST endpoints

**[POST /Connectors/{id}/scrape](http://0.0.0.0:3000/explorer/#!/Connectors/prototype_scrapeAndUpdateOrCreateRecords)** - сканировать и создать записи. Метод scrapeAndUpdateOrCreateRecords

**[PUT /Connectors/{id}/scrape](http://0.0.0.0:3000/explorer/#!/Connectors/prototype_scrapeAndUpdateOrCreateRecords)** - сканировать и обновить или создать новые записи.  Метод scrapeAndUpdateOrCreateRecords

 **[PUT /Connectors/{id}/startScheduler](http://0.0.0.0:3000/explorer/#!/Connectors/prototype_startScheduler)** - запустить планировщик. Метод startScheduler

 **[PUT /Connectors/{id}/stopScheduler](http://0.0.0.0:3000/explorer/#!/Connectors/prototype_stopScheduler)** - остановить планировщик. Метод stopScheduler


#### Project files

[./common/models/connector.js](./common/models/connector.js) - модель  
[./server/boot/scheduler.js](./server/boot/scheduler.js) - планировщик

## Record
Записи результатов сканирования.

#### Project files

[./common/models/record.js](./common/models/record.js) - модель  
[./server/boot/hooks.js](./server/boot/hooks.js) - хуки для автоматической записи и обновления результатов сканирования.

#### REST endpoints
доступны стандартные rest операции, кроме создания - записи создаются при вызове методов scrapeAndCreateRecords или scrapeAndUpdateOrCreateRecords.  
