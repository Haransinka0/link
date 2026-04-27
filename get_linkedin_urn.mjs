/**
 * Fetches your LinkedIn Person URN using your access token.
 * Run: node get_linkedin_urn.mjs
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const token = process.env.LINKEDIN_ACCESS_TOKEN

if (!token) {
  console.error('❌ LINKEDIN_ACCESS_TOKEN not set in .env.local')
  process.exit(1)
}

const res = await fetch('https://api.linkedin.com/v2/userinfo', {
  headers: {
    'Authorization': `Bearer ${token}`,
  }
})

if (!res.ok) {
  const err = await res.text()
  console.error(`❌ LinkedIn API error ${res.status}:`, err)
  process.exit(1)
}

const data = await res.json()
console.log('\n=== LinkedIn Profile ===')
console.log('Name:', data.name)
console.log('Email:', data.email)
console.log('Sub (Person ID):', data.sub)
console.log('\n✅ Your LINKEDIN_PERSON_URN is:')
console.log(`urn:li:person:${data.sub}`)
console.log('\nAdd this to .env.local:')
console.log(`LINKEDIN_PERSON_URN=urn:li:person:${data.sub}`)
