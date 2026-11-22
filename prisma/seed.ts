import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

const products = [
  { name: "Es Kopi Susu", price: 18000, stock: 30, image: "/products/es-kopi-susu.png" },
  { name: "Matcha Latte", price: 22000, stock: 20, image: "/products/matcha-latte.png" },
  { name: "Americano", price: 15000, stock: 25, image: "/products/americano.png" },
  { name: "Croissant Butter", price: 20000, stock: 15, image: "/products/croissant.png" },
  { name: "Churros Cokelat", price: 18000, stock: 12, image: "/products/churros.png" },
  { name: "Brownies Fudge", price: 16000, stock: 10, image: "/products/brownies.png" },
]

async function main() {
  const count = await db.product.count()
  if (count > 0) {
    console.log(`Skip seed: sudah ada ${count} produk di database`)
    return
  }
  for (const p of products) {
    await db.product.create({ data: p })
  }
  console.log(`Seed sukses: ${products.length} produk ditambahkan`)
}

main()
  .catch((e) => {
    console.error("Seed gagal:", e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
