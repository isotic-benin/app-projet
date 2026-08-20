type BrandLogoProps = {
    variant?: 'dark' | 'light';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showTagline?: boolean;
    className?: string;
};

const SIZES = {
    sm: {
        name: 'text-lg',
        sub: 'text-[9px] tracking-[0.3em]',
        tagline: 'text-[10px]',
        bar: 'mt-0.5',
    },
    md: {
        name: 'text-2xl',
        sub: 'text-[11px] tracking-[0.34em]',
        tagline: 'text-[11px]',
        bar: 'mt-1',
    },
    lg: {
        name: 'text-3xl',
        sub: 'text-[12px] tracking-[0.38em]',
        tagline: 'text-[12px]',
        bar: 'mt-1',
    },
    xl: {
        name: 'text-5xl',
        sub: 'text-[14px] tracking-[0.42em]',
        tagline: 'text-[13px]',
        bar: 'mt-1.5',
    },
};

export default function BrandLogo({
    variant = 'dark',
    size = 'md',
    showTagline = false,
    className = '',
}: BrandLogoProps) {
    const s = SIZES[size];
    const isLight = variant === 'light';

    return (
        <div className={`flex flex-col leading-none ${className}`}>
            <div className="flex items-baseline">
                <span className={`${s.name} font-extrabold tracking-tight ${isLight ? 'text-white' : 'text-navy'}`}>
                    Altia
                </span>
                <span
                    className={`${s.sub} font-bold uppercase ml-1 ${isLight ? 'text-primary-300' : 'text-primary-500'}`}
                >
                    Finance
                </span>
            </div>
            <div
                className={`${s.bar} h-px w-full rounded-full ${isLight ? 'bg-primary-400/50' : 'bg-primary-500/50'}`}
            />
            {showTagline && (
                <span className={`mt-1.5 ${s.tagline} tracking-wide ${isLight ? 'text-blue-200/80' : 'text-gray-400'}`}>
                    Microfinance & crédit en ligne
                </span>
            )}
        </div>
    );
}