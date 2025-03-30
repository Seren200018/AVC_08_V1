//import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'
import { ReactDom,React,  useState } from "react";
import "../css/style.css";

// Funktion: Ruft die aktuelle Scroll-Position ab
document.getScroll = function () {
    if (window.pageYOffset !== undefined) {
        return [pageXOffset, pageYOffset];
    } else {
        const d = document,
            r = d.documentElement,
            b = d.body;

        const sx = r.scrollLeft || b.scrollLeft || 0;
        const sy = r.scrollTop || b.scrollTop || 0;

        console.log(sy);
        return [sy];
    }
};
export default function FoldingLayout() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="layout">
            <div className={`main ${isOpen ? "moved" : ""}`} onClick={() => setIsOpen(!isOpen)}>
                Click Me
            </div>

            <div className={`fold-wrapper ${isOpen ? "show" : ""}`}>
                <div className={`fold-top`}>Top Half</div>
                <div className={`fold-bottom ${isOpen ? "folded" : ""}`}>Bottom Half</div>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('ABC'));
root.render(<FoldingLayout />)