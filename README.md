## Abrindo portas com NGROK

Para fazer rodar essa bomba aqui tem que instanciar uma relação DNS na porta 3000 (definida no arquivo `.env`) usando `ngrok` que dará também uma URL `HTTPS`.

```powershell
ngrok http 3000
```

## Inicializando projeto via Yarn

Com a conexão DNS estabelecida é importante iniciar o projeto com

```powershell
yarn start
```