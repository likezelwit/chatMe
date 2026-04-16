// ========== DATABASE FILM ==========
// Tambahkan film baru di array ini. Format:
// { id: 'UNIQUE_ID', title: 'Judul Film', genre: 'Genre • Tahun', duration: 'Durasi', rating: 'Rating', poster: 'URL_POSTER', url: 'URL_DRIVE_PREVIEW' }

const movieDatabase = [
    {
        id: "inside_out_1",
        title: "Inside Out",
        genre: "Animation • 2015",
        duration: "1j 35m",
        rating: "8.1",
        poster: "https://i.ibb.co.com/YFjZHxkW/Inside-Out-2015-film-poster.jpg",
        url: "https://drive.google.com/file/d/1tqBTAqkhx0oPFHknnCAa5AxfMK-RvJh2/view"
    },
    {
        id: "spy_family_code_white",
        title: "SPY x FAMILY CODE: White (Indo Dub)",
        genre: "Animation • Action • 2023",
        duration: "1j 50m",
        rating: "8.0",
        poster: "https://i.ibb.co.com/fdYgkJgD/download.jpg",
        url: "https://drive.google.com/file/d/16oa8r4WC0PyUgFCMAUMg2VBAbX_Rul5a/view"
    },
    {
        id: "inside_out_2",
        title: "Inside Out 2",
        genre: "Animation • 2024",
        duration: "1j 36m",
        rating: "NEW",
        poster: "https://i.ibb.co.com/YFjZHxkW/Inside-Out-2015-film-poster.jpg", // Poster placeholder jika belum ada
        url: "https://drive.google.com/file/d/1O1qYpL86eV-DaIGlHxQr9cem7Jk4A7FR/preview"
    },
    {
        id: "vina_7_hari",
        title: "Vina Sebelum 7 Hari",
        genre: "Horror • 2024",
        duration: "1j 48m",
        rating: "6.5",
        poster: "https://i.ibb.co.com/3Vhq3Xs/download.jpg",
        url: "https://drive.google.com/file/d/1FB78OENmO94VEz-qpR3Qzh4z8BkH1Kz7/preview"
    },
    {
        id: "spiderverse",
        title: "Spider-Man: Across the Spider-Verse",
        genre: "Animation • Action • 2023",
        duration: "2j 20m",
        rating: "8.7",
        poster: "https://i.ibb.co.com/GQgWK7mt/MV5-BNThi-Zj-A3-Mj-It-ZGY5-Ni00-Zm-Jh-LWEw-N2-Et-OTBl-YTA4-Y2-E0-M2-Zm-Xk-Ey-Xk-Fqc-Gc-V1.jpg",
        url: "https://drive.google.com/file/d/1NHaj3Dt1-CHvRhgZRO5B0-sMZbdXlamk/preview"
    },
    {
        id: "siksa_kubur",
        title: "Siksa Kubur",
        genre: "Horror • 2024",
        duration: "1j 50m",
        rating: "7.2",
        poster: "https://i.ibb.co.com/G307T8x4/download.jpg",
        url: "https://drive.google.com/file/d/1WR23FO9kL6gq3FyHp_e2_1qTODr-xFrW/preview"
    },
    // Contoh Film Lama (Sample)
    { id: "9v1atEBmUIc", title: "The Midnight Cinema", genre: "Horror • Mystery", duration: "1j 45m", rating: "8.5", poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60", url: "https://youtube.com/watch?v=9v1atEBmUIc" },
    { id: "aqz-KE-bpKQ", title: "Big Buck Bunny", genre: "Animation • Comedy", duration: "10m", rating: "7.5", poster: "https://images.unsplash.com/photo-1560167016-022b78a0258e?w=500&auto=format&fit=crop&q=60", url: "https://youtube.com/watch?v=aqz-KE-bpKQ" }
];
