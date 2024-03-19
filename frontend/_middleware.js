// Limit middleware pathname config
export const config = {
  matcher: '/(.*)',
}

export function middleware(req) {
  const body = `
    <html>
      <head>
         <link
            href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300&family=IBM+Plex+Mono:wght@300;400;700&family=IBM+Plex+Sans:wght@300;400;700&display=swap"
            rel="stylesheet"
          />
        <style>
          body {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background-color: #000;
            height: 100vh;
            text-align: center;
          }
          h1 {
            font-family: "Chakra Petch", sans-serif;
            color: #E6DAFE;
          }
          p {
            font-family: "IBM Plex San", sans-serif;
            color: #E6DAFE;
            max-width: 900px;
          }
          a {
            color: #fff;
          }
          a:hover {
            text-decoration: none; /* Optional: adds underline on hover */
          }
        </style>
      </head>
      <body>
        <h1>The airdrop claim period has ended</h1>
        <p>To stay in touch with future Wormhole community initiatives head over to our <a href="https://discord.gg/wormholecrypto">Discord</a></p>
      </body>
    </html>
    `

  // NextResponse object does not have a body property so we use Response instead
  /*return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  })*/
}
