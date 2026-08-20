'use client';

import React from 'react';
import Image from 'next/image';

const images = [
    { file: '1.png' },
    { file: '2.png' },
    { file: '3.jpg' },
    { file: '4.webp' },
    { file: '5.png' },
    { file: '6.png' },
    { file: '7.webp' },
];

export default function PartnerCarousel() {
    return (
        <section className="py-16 bg-white overflow-hidden border-t border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 text-center">
                <p className="text-sm font-bold tracking-widest text-gray-400 uppercase mb-2">Nos partenaires</p>
                <h2 className="text-2xl md:text-3xl font-extrabold text-navy">Nous travaillons en partenariat avec les plus grandes banques européennes</h2>
            </div>

            <div className="relative flex overflow-x-hidden group">
                <div className="animate-marquee flex whitespace-nowrap min-w-full">
                    {[...images, ...images, ...images].map((img, i) => (
                        <div key={i} className="flex-none mx-6 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
                            <div className="relative w-24 h-20 bg-white rounded-2xl border border-gray-200 flex items-center justify-center p-3">
                                <Image
                                    src={`/partenaires/${img.file}`}
                                    alt="Partenaire"
                                    width={120}
                                    height={80}
                                    className="object-contain w-full h-full"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .animate-marquee {
                    animation: marquee 35s linear infinite;
                }
                .group:hover .animate-marquee {
                    animation-play-state: paused;
                }
                @keyframes marquee {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-33.33%); }
                }
            `}</style>
        </section>
    );
}
