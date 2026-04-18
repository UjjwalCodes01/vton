"use client";

import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

type CalDemoButtonProps = {
	className?: string;
	label?: string;
};

export default function CalDemoButton({
	className = "btn btn-secondary",
	label = "Book a Demo",
}: CalDemoButtonProps) {
	useEffect(() => {
		async function loadCal() {
			const cal = await getCalApi({ namespace: "demo" });
			cal("ui", {
				hideEventTypeDetails: false,
				layout: "month_view",
			});
		}

		loadCal();
	}, []);

	return (
		<button
			type="button"
			className={className}
			data-cal-namespace="demo"
			data-cal-link="fabricvton-hz9xbt/demo"
			data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
		>
			{label}
		</button>
	);
}
