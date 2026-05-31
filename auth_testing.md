# Auth Testing

Use admin@icfhub.com / admin123 (admin) and foreman@icfhub.com / foreman123 (foreman) to test.

## API tests
```
# Login (sets httpOnly cookie)
curl -c cookies.txt -X POST $REACT_APP_BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@icfhub.com","password":"admin123"}'

# Me using cookie
curl -b cookies.txt $REACT_APP_BACKEND_URL/api/auth/me

# Logout
curl -b cookies.txt -X POST $REACT_APP_BACKEND_URL/api/auth/logout
```

## MongoDB checks
- Admin doc exists in `users` collection
- `password_hash` starts with `$2b$`
- Unique index on `users.email`
- TTL index on `password_reset_tokens.expires_at`
