import React, { useState } from 'react'
import Spinner from './Spinner'

const Subscribe = () => {
  const [status, setStatus] = useState({
    email: '',
    message: '',
    terms: false,
  })
  const [loading, setLoading] = useState(false)

  function validateEmail(email: string) {
    return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)
  }
  const handleChange = (event: any) => {
    setStatus((s) => ({ ...status, email: event.target.value }))
  }

  const handleSubmit = (event: any) => {
    event.preventDefault()
    setLoading(true)
    const postURL = `https://wormhole.ghost.io/members/api/send-magic-link/`

    const values = {
      email: status.email,
      emailType: `subscribe`,
      labels: ['wormhole'],
    }

    fetch(postURL, {
      method: `POST`,
      mode: `cors`,
      headers: { 'Content-Type': `application/json` },
      body: JSON.stringify(values),
    }).then((response) => {
      setLoading(false)
      response.ok
        ? setStatus((s) => ({ ...status, message: 'success' }))
        : setStatus((s) => ({ ...status, message: 'error' }))

      setTimeout(() => {
        setStatus({
          email: '',
          message: '',
          terms: false,
        })
      }, 2000)
    })
  }

  return (
    <>
      <div className="w-full">
        <form
          className={`${
            loading
              ? 'pointer-events-none opacity-30'
              : 'pointer-events-auto opacity-100'
          }`}
          onSubmit={handleSubmit}
        >
          <h2 className="text-2xl font-heading font-light">
            Subscribe for updates
          </h2>
          <div className="relative mb-2 mt-4 flex flex-col gap-2 sm:flex-row sm:gap-4">
            <input
              type="email"
              className="bg-opacity-35 h-11 w-full border border-white border-opacity-50 bg-black px-6 font-mono text-[13px] outline-none"
              id="outlined-name"
              placeholder="E-mail"
              value={status.email}
              onChange={handleChange}
            />

            <button
              type="submit"
              className="wbtn !h-11 flex-shrink-0 justify-center gap-2 font-mono font-semibold disabled:cursor-not-allowed disabled:opacity-25"
              value={status.email}
              disabled={
                status.terms == false || validateEmail(status.email) == false
                  ? true
                  : false
              }
            >
              Subscribe
              <svg
                width={13}
                height={9}
                viewBox="0 0 13 9"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8.13445 8.97557L13 4.4995L8.13445 0.0234376L7.11722 0.959101L10.2404 3.83123L4.43299e-08 3.83123L5.98891e-08 5.16772L10.2404 5.16772L7.11722 8.03985L8.13445 8.97557Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
          <label className="my-6 flex gap-2 text-xs font-light">
            <input
              type="checkbox"
              name="terms"
              id=""
              required
              checked={status.terms}
              onChange={() =>
                setStatus((s) => ({ ...status, terms: !status.terms }))
              }
              className="checkbox bg-opacity-15 h-4 w-4 appearance-none border border-white bg-white"
            />
            <span className="opacity-70">
              I agree to receive marketing emails and other communications
            </span>
          </label>
        </form>

        <div className="pb-4 font-mono text-xs">
          {!loading && status.message == 'success' && (
            <div className="flex items-center gap-4  text-xs ">
              <p>Success — check your email!</p>
            </div>
          )}
          {!loading && status.message == 'error' && (
            <div className="flex items-center gap-4  text-xs">
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="0.25"
                  y="0.25"
                  width="27.5"
                  height="27.5"
                  fill="black"
                  fill-opacity="0.4"
                  stroke="white"
                  stroke-width="0.5"
                />
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M14.4212 16.8356L14.4212 12.7647L13.5791 12.7647L13.5791 16.8356L14.4212 16.8356Z"
                  fill="white"
                />
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M14.4212 18.8706L14.4212 17.966L13.5791 17.966L13.5791 18.8706L14.4212 18.8706Z"
                  fill="white"
                />
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M14 7L6 21H22L14 7ZM14 8.68818L7.43526 20.1765H20.5647L14 8.68818Z"
                  fill="white"
                />
              </svg>
              <p className="">Something went wrong. Please try again later.</p>
            </div>
          )}
          {loading && <Spinner />}
        </div>
      </div>
    </>
  )
}

export default Subscribe
