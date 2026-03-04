# curl examples (local)

## env

```bash
export BASE_URL=http://localhost:3000
export BASIC_USER=gyg_user
export BASIC_PASS=gyg_pass
export ADMIN_TOKEN=admin_dev_token
```

## 1) create product (admin)

```bash
curl -X POST "$BASE_URL/admin/products" \
  -H "content-type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{
    "supplierId":"supplier123",
    "productId":"prod123",
    "name":"Berlin Walking Tour",
    "description":"Small-group city walking tour",
    "timezone":"Europe/Berlin",
    "currency":"EUR",
    "status":"active",
    "destinationCity":"Berlin",
    "destinationCountry":"DEU",
    "pricingCategories":[
      {"category":"ADULT","minTicketAmount":1,"maxTicketAmount":10,"bookingCategory":"STANDARD","price":[{"priceType":"RETAIL_PRICE","price":1500,"currency":"EUR"}]},
      {"category":"CHILD","minTicketAmount":0,"maxTicketAmount":10,"bookingCategory":"STANDARD","price":[{"priceType":"RETAIL_PRICE","price":1000,"currency":"EUR"}]}
    ]
  }'
```

## 2) query availabilities (GYG -> supplier)

```bash
curl -u "$BASIC_USER:$BASIC_PASS" \
  "$BASE_URL/1/get-availabilities/?productId=prod123&fromDateTime=2030-01-01T00:00:00%2B01:00&toDateTime=2030-01-10T23:59:59%2B01:00"
```

## 3) reserve

```bash
curl -X POST "$BASE_URL/1/reserve/" \
  -u "$BASIC_USER:$BASIC_PASS" \
  -H "content-type: application/json" \
  -d '{
    "data":{
      "productId":"prod123",
      "dateTime":"2030-01-02T10:00:00+01:00",
      "bookingItems":[{"category":"ADULT","count":2}],
      "gygBookingReference":"GYG-REF-1001"
    }
  }'
```

## 4) book

```bash
curl -X POST "$BASE_URL/1/book/" \
  -u "$BASIC_USER:$BASIC_PASS" \
  -H "content-type: application/json" \
  -d '{
    "data":{
      "productId":"prod123",
      "reservationReference":"res_GYG-REF-1001",
      "gygBookingReference":"GYG-REF-1001",
      "currency":"EUR",
      "dateTime":"2030-01-02T10:00:00+01:00",
      "bookingItems":[{"category":"ADULT","count":2,"retailPrice":1500}],
      "travelers":[{"firstName":"John","lastName":"Smith","email":"john@example.com","phoneNumber":"+49123456"}],
      "comment":"\\n"
    }
  }'
```

## 5) idempotent re-book (same gygBookingReference)

```bash
curl -X POST "$BASE_URL/1/book/" \
  -u "$BASIC_USER:$BASIC_PASS" \
  -H "content-type: application/json" \
  -d '{
    "data":{
      "productId":"prod123",
      "reservationReference":"res_GYG-REF-1001",
      "gygBookingReference":"GYG-REF-1001",
      "currency":"EUR",
      "dateTime":"2030-01-02T10:00:00+01:00",
      "bookingItems":[{"category":"ADULT","count":2,"retailPrice":1500}],
      "travelers":[{"firstName":"John","lastName":"Smith","email":"john@example.com","phoneNumber":"+49123456"}],
      "comment":"\\n"
    }
  }'
```

## 6) cancel booking

```bash
curl -X POST "$BASE_URL/1/cancel-booking/" \
  -u "$BASIC_USER:$BASIC_PASS" \
  -H "content-type: application/json" \
  -d '{
    "data":{
      "bookingReference":"bk_GYG-REF-1001",
      "gygBookingReference":"GYG-REF-1001",
      "productId":"prod123"
    }
  }'
```

## 7) admin list bookings

```bash
curl "$BASE_URL/admin/bookings" -H "x-admin-token: $ADMIN_TOKEN"
```
